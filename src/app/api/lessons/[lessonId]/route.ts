import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import dbConnect from '@/lib/db';
import Lesson from '@/models/Lesson';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { apiHandler } from '@/lib/apiHandler';

// Text extractors
import mammoth from 'mammoth';
const pdfParse = require('pdf-parse-fork');

export const PUT = apiHandler(async (req: NextRequest, { params }: { params: { lessonId: string } }) => {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const lessonId = params.lessonId;
  const formData = await req.formData();

  const title       = formData.get('title') as string;
  const contentType = formData.get('contentType') as string;

  // New structured fields from FormData (expected as JSON strings)
  const overview          = formData.get('overview') as string || '';
  const objectives        = JSON.parse(formData.get('objectives') as string || '[]');
  const keyTerms          = JSON.parse(formData.get('keyTerms') as string || '[]');
  const contentSections   = JSON.parse(formData.get('contentSections') as string || '[]');
  const estimatedDuration = Number(formData.get('estimatedDuration')) || 0;
  const prerequisites     = formData.get('prerequisites') as string || '';
  const additionalNotes   = formData.get('additionalNotes') as string || '';
  const videoTimestamps   = formData.get('videoTimestamps') as string || '';

  let contentBody = formData.get('contentBody') as string || '';
  let contentUrl  = formData.get('videoUrl') as string || '';
  let extractedFileText = '';

  const file = formData.get('file');
  
  if (file instanceof File) {
    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'lessons');
    await mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    contentUrl = `/uploads/lessons/${filename}`;
    
    if (contentType === 'pdf') {
      const data = await pdfParse(buffer);
      extractedFileText = data.text;
    } else if (contentType === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      extractedFileText = result.value;
    }
  }

  // Combine ALL structured content for AI
  const contentText = [
    overview,
    objectives?.join('. '),
    contentSections?.map((s: any) => `${s.sectionTitle}: ${s.sectionBody}`).join('\n'),
    contentBody, // For video summary or legacy text
    additionalNotes,
    keyTerms?.map((kt: any) => `${kt.term}: ${kt.definition}`).join('. '),
    extractedFileText
  ].filter(Boolean).join('\n\n').slice(0, 10000);

  const updateData: any = {
    title,
    contentType,
    contentBody,
    contentText,
    overview,
    objectives,
    keyTerms,
    estimatedDuration,
    prerequisites,
    additionalNotes,
    contentSections,
    videoTimestamps
  };

  if (contentUrl) updateData.contentUrl = contentUrl;

  const updatedLesson = await Lesson.findByIdAndUpdate(
    lessonId,
    updateData,
    { new: true }
  );

  if (!updatedLesson) throw { status: 404, message: 'Lesson not found' };

  return { success: true, lesson: updatedLesson };
});

export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: { lessonId: string } }) => {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  await Lesson.findByIdAndDelete(params.lessonId);
  return { success: true };
});
