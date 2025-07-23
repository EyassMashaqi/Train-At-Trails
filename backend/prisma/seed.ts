import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample questions
  const questions = [
    {
      questionNumber: 1,
      title: "Welcome to Train at Trails!",
      content: "What's your favorite mode of transportation and why? Tell us about a memorable journey you've taken.",
      isActive: true
    },
    {
      questionNumber: 2,
      title: "Adventure Planning",
      content: "If you could travel anywhere in the world, where would you go and what would you want to experience there?",
      isActive: false
    },
    {
      questionNumber: 3,
      title: "Problem Solving",
      content: "Describe a challenging situation you faced recently and how you overcame it. What did you learn from the experience?",
      isActive: false
    },
    {
      questionNumber: 4,
      title: "Innovation & Creativity",
      content: "What's an idea or innovation that you think could make the world a better place? How would you implement it?",
      isActive: false
    },
    {
      questionNumber: 5,
      title: "Personal Growth",
      content: "What skill would you like to learn or improve this year? What steps would you take to develop it?",
      isActive: false
    },
    {
      questionNumber: 6,
      title: "Team Collaboration",
      content: "Describe a time when you worked successfully with others to achieve a goal. What made the collaboration effective?",
      isActive: false
    },
    {
      questionNumber: 7,
      title: "Future Vision",
      content: "How do you envision technology changing our daily lives in the next 10 years? What excites or concerns you about these changes?",
      isActive: false
    },
    {
      questionNumber: 8,
      title: "Leadership & Influence",
      content: "Describe a person who has positively influenced your life. What qualities made them impactful, and how do you apply those lessons?",
      isActive: false
    },
    {
      questionNumber: 9,
      title: "Cultural Exploration",
      content: "Tell us about a cultural tradition, food, or custom that you find fascinating. What draws you to it?",
      isActive: false
    },
    {
      questionNumber: 10,
      title: "Environmental Awareness",
      content: "What's one change you've made or would like to make to live more sustainably? How do you think individuals can contribute to environmental protection?",
      isActive: false
    },
    {
      questionNumber: 11,
      title: "Personal Achievement",
      content: "What's an accomplishment you're particularly proud of? What challenges did you overcome to achieve it?",
      isActive: false
    },
    {
      questionNumber: 12,
      title: "Reflection & Growth",
      content: "Looking back at your journey through these questions, what insights have you gained about yourself? How will you apply these learnings moving forward?",
      isActive: false
    }
  ];

  // Clear existing questions
  await prisma.question.deleteMany();
  console.log('🗑️  Cleared existing questions');

  // Create questions
  for (const questionData of questions) {
    await prisma.question.create({
      data: {
        ...questionData,
        releaseDate: new Date(), // Make first question immediately available
      }
    });
  }
  console.log('📝 Created 12 questions');

  // Create admin user
  const adminEmail = 'admin@traintrails.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        fullName: 'Admin User',
        trainName: 'Control Tower',
        isAdmin: true,
        currentStep: 1,
      }
    });
    console.log('👤 Created admin user (admin@traintrails.com / admin123)');
  }

  // Create sample test user
  const testEmail = 'test@traintrails.com';
  const existingTest = await prisma.user.findUnique({
    where: { email: testEmail }
  });

  if (!existingTest) {
    const hashedPassword = await bcrypt.hash('test123', 10);
    await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        fullName: 'Test User',
        trainName: 'Lightning Express',
        isAdmin: false,
        currentStep: 1,
      }
    });
    console.log('👤 Created test user (test@traintrails.com / test123)');
  }

  // Create additional test users for leaderboard
  const additionalUsers = [
    { email: 'alice@traintrails.com', fullName: 'Alice Johnson', trainName: 'Mountain Explorer', currentStep: 8 },
    { email: 'bob@traintrails.com', fullName: 'Bob Smith', trainName: 'Speed Demon', currentStep: 5 },
    { email: 'carol@traintrails.com', fullName: 'Carol Williams', trainName: 'Adventure Seeker', currentStep: 12 },
    { email: 'david@traintrails.com', fullName: 'David Brown', trainName: 'Trail Blazer', currentStep: 3 },
    { email: 'emma@traintrails.com', fullName: 'Emma Davis', trainName: 'Sky Runner', currentStep: 9 },
  ];

  for (const userData of additionalUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (!existing) {
      const hashedPassword = await bcrypt.hash('demo123', 10);
      await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          fullName: userData.fullName,
          trainName: userData.trainName,
          isAdmin: false,
          currentStep: userData.currentStep,
        }
      });
      console.log(`👤 Created user: ${userData.fullName} (${userData.email})`);
    }
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
