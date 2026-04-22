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

export const POST = apiHandler(async (req: NextRequest) => {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'tutor') {
    throw { status: 401, message: 'Unauthorized' };
  }

  const formData = await req.formData();

  const moduleId    = formData.get('moduleId') as string;
  const title       = formData.get('title') as string;
  const contentType = formData.get('contentType') as string;
  const order       = Number(formData.get('order')) || 0;

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

  if (contentType === 'pdf' || contentType === 'docx') {
    const file = formData.get('file') as File;
    if (file) {
      const bytes  = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'lessons');
      await mkdir(uploadDir, { recursive: true });
      const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);

      contentUrl = `/uploads/lessons/${filename}`;
      
      try {
        if (contentType === 'pdf') {
          const data = await pdfParse(buffer);
          extractedFileText = data.text || '';
        } else {
          const result = await mammoth.extractRawText({ buffer });
          extractedFileText = result.value || '';
        }
      } catch (extractErr: any) {
        // Do not block lesson creation if text extraction fails on malformed files.
        // We still keep the uploaded file URL so tutors/students can access the source file.
        console.warn('[LESSON-UPLOAD] Text extraction failed, continuing without extracted text:', extractErr?.message || extractErr);
        extractedFileText = '';
      }
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

  const lesson = await Lesson.create({
    moduleId,
    title,
    contentType,
    contentBody,
    contentUrl,
    contentText,
    order,
    overview,
    objectives,
    keyTerms,
    estimatedDuration,
    prerequisites,
    additionalNotes,
    contentSections,
    videoTimestamps
  });

  return lesson;
});
