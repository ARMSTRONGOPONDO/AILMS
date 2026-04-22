import dbConnect from '../lib/db';
import Lesson from '../models/Lesson';

async function check() {
  await dbConnect();
  const lessons = await Lesson.find({}, 'title contentType contentText');
  console.log('--- DATABASE CHECK ---');
  lessons.forEach(l => {
    console.log(`Title: ${l.title}`);
    console.log(`Type: ${l.contentType}`);
    console.log(`ContentText Length: ${l.contentText?.length || 0}`);
    console.log(`ContentText Preview: ${l.contentText?.substring(0, 50)}...`);
    console.log('----------------------');
  });
  process.exit(0);
}

check();
