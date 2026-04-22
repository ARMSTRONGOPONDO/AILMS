import dbConnect from '../lib/db';
import User from '../models/User';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await dbConnect();
    
    console.log('Checking for existing users...');
    const userExists = await User.findOne({ email: 'admin@test.com' });
    
    if (userExists) {
      console.log('Seed user already exists.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const admin = new User({
      name: 'Admin User',
      email: 'admin@test.com',
      passwordHash: hashedPassword,
      role: 'admin',
    });

    await admin.save();
    console.log('✅ Database seeded! You should now see "ai_lms" in MongoDB Compass.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();
