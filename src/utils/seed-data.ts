import dbConnect from '@/lib/db';
import User from '@/models/User';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import Assignment from '@/models/Assignment';
import Quiz from '@/models/Quiz';
import bcrypt from 'bcryptjs';

export async function seed() {
  await dbConnect();

  // 1. CLEAN START (Optional but recommended for reliable testing)
  // We keep the admin if any, but clear courses/content to see the new structure clearly
  await Promise.all([
    Course.deleteMany({}),
    Module.deleteMany({}),
    Lesson.deleteMany({}),
    Assignment.deleteMany({}),
    Quiz.deleteMany({})
  ]);

  // 2. Setup Tutor
  const tutor = await User.findOneAndUpdate(
    { email: 'prof@ai-lms.edu' },
    {
      name: 'Prof. AI Scientist',
      passwordHash: await bcrypt.hash('password', 10),
      role: 'tutor',
      status: 'active'
    },
    { upsert: true, new: true }
  );

  // 3. Create Detailed Course
  const courseTitles = [
    'Deep Learning Masterclass',
    'Data Science Essentials',
    'LLM Engineering & Prompts',
    'Computer Vision Systems',
    'Robotics & Automation'
  ];

  for (let c = 0; c < courseTitles.length; c++) {
    const course = await Course.create({
      title: courseTitles[c],
      description: `A masterclass in ${courseTitles[c]}, covering everything from basics to advanced production deployment.`,
      tutorId: tutor._id,
      category: ['Engineering', 'Data Science', 'Technology'][c % 3],
      isPublished: true
    });

    // Create 3 Modules per Course
    for (let m = 1; m <= 3; m++) {
      const mod = await Module.create({
        courseId: course._id,
        title: `Module ${m}: ${['Foundations', 'Advanced Theory', 'Production Scaling'][m-1]}`,
        description: `This module covers the ${['foundational', 'advanced theoretical', 'production scaling'][m-1]} aspects of ${courseTitles[c]}.`,
        order: m
      });

      // Create 3 Lessons per Module
      for (let l = 1; l <= 3; l++) {
        const title = `Lesson ${l}: ${['Introduction', 'Core Logic', 'Practical Lab'][l-1]}`;
        const overview = `This lesson explores ${title} in the context of ${mod.title}. Students will gain hands-on experience and theoretical depth.`;
        
        const objectives = [
          `Master the primary concepts of ${title}`,
          `Understand how ${title} fits into the broader ${course.title} ecosystem`,
          'Solve complex problems using established industry best practices'
        ];

        const keyTerms = [
          { term: 'Protocol X', definition: 'The standard operating procedure for this specific architectural layer.' },
          { term: 'Delta Efficiency', definition: 'The measure of performance improvement after applying optimization Y.' }
        ];

        const contentSections = [
          {
            sectionTitle: 'Historical Context',
            sectionBody: `The evolution of ${title} started in the early 2010s. **Key Milestone:** The release of paper Z revolutionized how we think about this.`
          },
          {
            sectionTitle: 'Current Implementation',
            sectionBody: `Today, we use a hybrid approach. 
- Requirement 1: Low Latency
- Requirement 2: Scalability
- Requirement 3: Security

Check the code samples in the lab section for more details.`
          }
        ];

        const additionalNotes = `Note from ${tutor.name}: Be sure to review the key terms before starting the Module ${m} assignment.`;

        // Build contentText for Gemini
        const contentText = [
          overview,
          objectives.join('. '),
          contentSections.map(s => `${s.sectionTitle}: ${s.sectionBody}`).join('\n'),
          additionalNotes,
          keyTerms.map(kt => `${kt.term}: ${kt.definition}`).join('. ')
        ].filter(Boolean).join('\n\n');

        await Lesson.create({
          moduleId: mod._id,
          title,
          contentType: 'text',
          overview,
          objectives,
          estimatedDuration: 15 * l,
          prerequisites: l > 1 ? `Completion of Lesson ${l-1}` : 'Basic coding knowledge',
          keyTerms,
          contentSections,
          additionalNotes,
          contentText,
          order: l
        });
      }

      // Create 1 Assignment per Module
      await Assignment.create({
        courseId: course._id,
        tutorId: tutor._id,
        title: `Assignment: ${mod.title} Review`,
        description: `Reflect on the concepts learned in ${mod.title}. Provide a 1000-word analysis on how to optimize ${courseTitles[c]} using the techniques from Lesson 2.`,
        rubric: '30% Technical Accuracy, 30% Logic & Flow, 20% Grammar, 20% Creative Solutioning',
        dueDate: new Date(Date.now() + (m * 7) * 24 * 60 * 60 * 1000)
      });
    }
  }

  return { success: true };
}
