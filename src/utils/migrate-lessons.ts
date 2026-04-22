import dbConnect from '../lib/db';
import Lesson from '../models/Lesson';
import path from 'path';
import fs from 'fs';
import mammoth from 'mammoth';
const pdfParse = require('pdf-parse-fork');

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await dbConnect();

    const lessons = await Lesson.find({});
    console.log(`Found ${lessons.length} lessons to process.`);

    for (const lesson of lessons) {
      console.log(`Processing lesson: ${lesson.title} (${lesson.contentType})`);
      
      let extractedText = '';

      if (lesson.contentType === 'text' || lesson.contentType === 'video') {
        extractedText = lesson.contentBody || '';
      } else if (lesson.contentType === 'pdf' || lesson.contentType === 'docx') {
        if (lesson.contentUrl) {
          const filePath = path.join(process.cwd(), 'public', lesson.contentUrl);
          if (fs.existsSync(filePath)) {
            const buffer = fs.readFileSync(filePath);
            if (lesson.contentType === 'pdf') {
              const data = await pdfParse(buffer);
              extractedText = data.text;
            } else {
              const result = await mammoth.extractRawText({ buffer });
              extractedText = result.value;
            }
          } else {
            console.warn(`File not found: ${filePath}`);
          }
        }
      }

      if (extractedText) {
        lesson.contentText = extractedText.slice(0, 10000);
        await lesson.save();
        console.log(`✅ Updated contentText for: ${lesson.title}`);
      } else {
        console.log(`- No text extracted for: ${lesson.title}`);
      }
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
