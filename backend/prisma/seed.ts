import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample questions with new management fields
  const questions = [
    {
      questionNumber: 1,
      title: "Welcome to Train at Trails!",
      content: "What's your favorite mode of transportation and why? Tell us about a memorable journey you've taken.",
      description: "This is our opening question to get participants thinking about travel and journeys. Share your personal experiences and preferences.",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      points: 100,
      bonusPoints: 50,
      isActive: true,
      isReleased: true
    },
    {
      questionNumber: 2,
      title: "Adventure Planning",
      content: "If you could travel anywhere in the world, where would you go and what would you want to experience there?",
      description: "Explore dreams and aspirations about travel destinations. Think about cultural experiences, natural wonders, or personal growth opportunities.",
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      points: 100,
      bonusPoints: 50,
      isActive: false,
      isReleased: false
    },
    {
      questionNumber: 3,
      title: "Problem Solving",
      content: "Describe a challenging situation you faced recently and how you overcame it. What did you learn from the experience?",
      description: "Share problem-solving skills and resilience. Focus on the process of overcoming challenges and lessons learned.",
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
      points: 120,
      bonusPoints: 60,
      isActive: false,
      isReleased: false
    },
    {
      questionNumber: 4,
      title: "Innovation & Creativity",
      content: "What's an idea or innovation that you think could make the world a better place? How would you implement it?",
      description: "Think creatively about solutions to global challenges. Consider feasibility, impact, and implementation strategies.",
      deadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 4 weeks from now
      points: 150,
      bonusPoints: 75,
      isActive: false,
      isReleased: false
    },
    {
      questionNumber: 5,
      title: "Personal Growth",
      content: "What skill would you like to learn or improve this year? What steps would you take to develop it?",
      description: "Reflect on personal development goals and create actionable plans for skill improvement.",
      deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // 5 weeks from now
      points: 100,
      bonusPoints: 50,
      isActive: false,
      isReleased: false
    },
    {
      questionNumber: 6,
      title: "Team Collaboration",
      content: "Describe a time when you worked successfully with others to achieve a goal. What made the collaboration effective?",
      description: "Share experiences about teamwork, communication, and collaboration. Focus on what makes teams successful.",
      deadline: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000), // 6 weeks from now
      points: 130,
      bonusPoints: 65,
      isActive: false,
      isReleased: false
    },
    {
      questionNumber: 7,
      title: "Future Vision",
      content: "How do you envision technology changing our daily lives in the next 10 years? What excites or concerns you about these changes?",
      description: "Explore perspectives on technological advancement and its impact on society. Consider both opportunities and challenges.",
      deadline: new Date(Date.now() + 49 * 24 * 60 * 60 * 1000), // 7 weeks from now
      points: 140,
      bonusPoints: 70,
      isActive: false,
      isReleased: false
    },
    {
      questionNumber: 8,
      title: "Leadership & Influence",
      content: "Describe a person who has positively influenced your life. What qualities made them impactful, and how do you apply those lessons?",
      description: "Reflect on mentorship, leadership qualities, and personal influence. Share how others have shaped your growth.",
      deadline: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000), // 8 weeks from now
      points: 110,
      bonusPoints: 55,
      isActive: false,
      isReleased: false
    },
    {
      questionNumber: 9,
      title: "Cultural Exploration",
      content: "Tell us about a cultural tradition, food, or custom that you find fascinating. What draws you to it?",
      description: "Explore cultural diversity and appreciation. Share curiosity about different traditions and customs around the world.",
      deadline: new Date(Date.now() + 63 * 24 * 60 * 60 * 1000), // 9 weeks from now
      points: 100,
      bonusPoints: 50,
      isActive: false,
      isReleased: false
    },
    {
      questionNumber: 10,
      title: "Environmental Awareness",
      content: "What's one change you've made or would like to make to live more sustainably? How do you think individuals can contribute to environmental protection?",
      description: "Discuss environmental consciousness and sustainable living practices. Share actionable steps for environmental protection.",
      deadline: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000), // 10 weeks from now
      points: 125,
      bonusPoints: 75,
      isActive: false,
      isReleased: false
    },
    {
      questionNumber: 11,
      title: "Personal Achievement",
      content: "What's an accomplishment you're particularly proud of? What challenges did you overcome to achieve it?",
      description: "Celebrate personal achievements and the journey to success. Reflect on perseverance and goal achievement.",
      deadline: new Date(Date.now() + 77 * 24 * 60 * 60 * 1000), // 11 weeks from now
      points: 120,
      bonusPoints: 60,
      isActive: false,
      isReleased: false
    },
    {
      questionNumber: 12,
      title: "Reflection & Growth",
      content: "Looking back at your journey through these questions, what insights have you gained about yourself? How will you apply these learnings moving forward?",
      description: "Final reflection on the entire journey. Synthesize learnings and create plans for future application of insights gained.",
      deadline: new Date(Date.now() + 84 * 24 * 60 * 60 * 1000), // 12 weeks from now
      points: 200,
      bonusPoints: 100,
      isActive: false,
      isReleased: false
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
        releaseDate: questionData.isReleased ? new Date() : null,
      }
    });
  }
  console.log('📝 Created 12 questions with management fields');

  console.log('👥 Starting user creation...');

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

  console.log('🎯 User creation completed');
  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
