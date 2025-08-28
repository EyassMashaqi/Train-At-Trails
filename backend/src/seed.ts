import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create game configuration
  const gameConfig = await prisma.gameConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      questionReleaseIntervalHours: parseInt(process.env.QUESTION_RELEASE_INTERVAL_HOURS || '48'),
      totalQuestions: 12,
      gameStartDate: new Date()
    }
  });

  console.log('📝 Game configuration created:', gameConfig);

  // Create or find default cohort
  const defaultCohort = await prisma.cohort.upsert({
    where: { 
      name_cohortNumber: {
        name: 'Default Cohort',
        cohortNumber: 1
      }
    },
    update: {},
    create: {
      name: 'Default Cohort',
      cohortNumber: 1,
      description: 'Default cohort for new users and general training',
      startDate: new Date(),
      endDate: null,
      isActive: true
    }
  });

  console.log('🎯 Default cohort:', defaultCohort.name);

  // Create modules for the cohort
  const modules = [
    {
      moduleNumber: 1,
      title: "Getting Started",
      description: "Welcome and initial orientation module covering introduction and goal setting.",
      theme: "trains"
    },
    {
      moduleNumber: 2,
      title: "Foundation Skills",
      description: "Core skills development including problem-solving and collaboration fundamentals.",
      theme: "trains"
    },
    {
      moduleNumber: 3,
      title: "Advanced Concepts",
      description: "Innovation, creativity, and leadership development.",
      theme: "trains"
    },
    {
      moduleNumber: 4,
      title: "Mastery & Reflection",
      description: "Advanced application, reflection, and future planning.",
      theme: "trains"
    }
  ];

  const createdModules = [];
  for (const moduleData of modules) {
    const module = await prisma.module.upsert({
      where: {
        moduleNumber_cohortId: {
          moduleNumber: moduleData.moduleNumber,
          cohortId: defaultCohort.id
        }
      },
      update: {
        title: moduleData.title,
        description: moduleData.description,
        theme: moduleData.theme,
        isActive: moduleData.moduleNumber === 1, // First module should be active
        isReleased: moduleData.moduleNumber === 1, // First module should be released
        releaseDate: moduleData.moduleNumber === 1 ? new Date() : null
      },
      create: {
        moduleNumber: moduleData.moduleNumber,
        title: moduleData.title,
        description: moduleData.description,
        theme: moduleData.theme,
        isActive: moduleData.moduleNumber === 1, // First module should be active
        isReleased: moduleData.moduleNumber === 1, // First module should be released
        releaseDate: moduleData.moduleNumber === 1 ? new Date() : null,
        cohortId: defaultCohort.id
      }
    });
    createdModules.push(module);
    console.log(`📚 Module ${module.moduleNumber} created: ${module.title}`);
  }

  // Create admin user
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@trainattrails.com' },
    update: {
      currentCohortId: defaultCohort.id
    },
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@trainattrails.com',
      password: adminPassword,
      fullName: 'Admin User',
      trainName: 'Admin Express',
      isAdmin: true,
      currentCohortId: defaultCohort.id
    }
  });

  console.log('👑 Admin user created:', { email: adminUser.email, isAdmin: adminUser.isAdmin });

  // Create sample questions associated with modules
  const questions = [
    {
      questionNumber: 1,
      title: "Welcome Aboard!",
      content: "Welcome to BVisionRY Lighthouse! This is your first challenge. Tell us about yourself and why you're excited to be part of this journey. What do you hope to achieve through this experience?",
      moduleIndex: 0, // Getting Started module
      topicNumber: 1,
      category: "Introduction"
    },
    {
      questionNumber: 2,
      title: "Your Learning Goals",
      content: "What are three specific skills or areas of knowledge you want to develop during this program? How do these align with your personal or professional goals?",
      moduleIndex: 0, // Getting Started module
      topicNumber: 2,
      category: "Goal Setting"
    },
    {
      questionNumber: 3,
      title: "Problem-Solving Approach",
      content: "Describe a challenging problem you've faced recently and how you approached solving it. What steps did you take, and what did you learn from the experience?",
      moduleIndex: 1, // Foundation Skills module
      topicNumber: 1,
      category: "Problem Solving"
    },
    {
      questionNumber: 4,
      title: "Collaboration and Teamwork",
      content: "Share an example of a successful collaboration or team project you've been part of. What made it successful, and what role did you play in achieving the team's goals?",
      moduleIndex: 1, // Foundation Skills module
      topicNumber: 2,
      category: "Teamwork"
    },
    {
      questionNumber: 5,
      title: "Innovation and Creativity",
      content: "Describe a time when you had to think creatively or come up with an innovative solution. What was the situation, and how did your creative approach make a difference?",
      moduleIndex: 2, // Advanced Concepts module
      topicNumber: 1,
      category: "Innovation"
    },
    {
      questionNumber: 6,
      title: "Overcoming Challenges",
      content: "Tell us about a significant obstacle you've overcome. What strategies did you use to persist through difficulties, and how did this experience shape you?",
      moduleIndex: 1, // Foundation Skills module
      topicNumber: 3,
      category: "Resilience"
    },
    {
      questionNumber: 7,
      title: "Leadership and Initiative",
      content: "Describe a situation where you took initiative or demonstrated leadership, even if you weren't in a formal leadership role. What motivated you to step up, and what was the outcome?",
      moduleIndex: 2, // Advanced Concepts module
      topicNumber: 2,
      category: "Leadership"
    },
    {
      questionNumber: 8,
      title: "Continuous Learning",
      content: "How do you stay current with trends and developments in your field of interest? Describe your approach to lifelong learning and give a specific example of something new you've learned recently.",
      moduleIndex: 2, // Advanced Concepts module
      topicNumber: 3,
      category: "Learning"
    },
    {
      questionNumber: 9,
      title: "Impact and Contribution",
      content: "Describe a project or activity where you made a meaningful contribution or impact. How did you measure success, and what feedback did you receive about your contribution?",
      moduleIndex: 3, // Mastery & Reflection module
      topicNumber: 1,
      category: "Impact"
    },
    {
      questionNumber: 10,
      title: "Future Vision",
      content: "Where do you see yourself in 2-3 years? What steps are you taking now to work toward that vision, and how does this program fit into your journey?",
      moduleIndex: 3, // Mastery & Reflection module
      topicNumber: 2,
      category: "Planning"
    },
    {
      questionNumber: 11,
      title: "Reflection and Growth",
      content: "Looking back at your journey through this program so far, what has been your most significant learning or insight? How has it changed your perspective or approach to challenges?",
      moduleIndex: 3, // Mastery & Reflection module
      topicNumber: 3,
      category: "Reflection"
    },
    {
      questionNumber: 12,
      title: "Final Challenge",
      content: "Congratulations on reaching the final station! Describe how you would apply everything you've learned in this program to mentor someone else who is just starting their journey. What advice would you give them?",
      moduleIndex: 3, // Mastery & Reflection module
      topicNumber: 4,
      category: "Mentorship"
    }
  ];

  for (const questionData of questions) {
    // Calculate deadline (1-12 weeks from now based on question number)
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + (questionData.questionNumber * 7));

    // Get the module for this question
    const questionModule = createdModules[questionData.moduleIndex];

    const question = await prisma.question.upsert({
      where: { 
        questionNumber_cohortId: {
          questionNumber: questionData.questionNumber,
          cohortId: defaultCohort.id
        }
      },
      update: {
        title: questionData.title,
        content: questionData.content,
        description: questionData.content, // Use content as description for now
        deadline: deadlineDate,
        points: 100 + (questionData.questionNumber * 10), // Progressive points
        bonusPoints: 50,
        moduleId: questionModule.id,
        topicNumber: questionData.topicNumber,
        category: questionData.category
      },
      create: {
        questionNumber: questionData.questionNumber,
        title: questionData.title,
        content: questionData.content,
        description: questionData.content, // Use content as description for now
        deadline: deadlineDate,
        points: 100 + (questionData.questionNumber * 10), // Progressive points
        bonusPoints: 50,
        isActive: questionData.questionNumber === 1, // First question should be active
        isReleased: questionData.questionNumber === 1, // First question should be released
        releaseDate: questionData.questionNumber === 1 ? new Date() : null,
        cohortId: defaultCohort.id,
        moduleId: questionModule.id,
        topicNumber: questionData.topicNumber,
        category: questionData.category
      }
    });
    console.log(`📋 Question ${question.questionNumber} created: ${question.title} (Module: ${questionModule.title})`);
  }

  // Create a few sample users for testing
  const sampleUsers = [
    {
      email: 'alice@example.com',
      fullName: 'Alice Johnson',
      trainName: 'Lightning Express'
    },
    {
      email: 'bob@example.com',
      fullName: 'Bob Smith',
      trainName: 'Thunder Bolt'
    },
    {
      email: 'carol@example.com',
      fullName: 'Carol Davis',
      trainName: 'Star Cruiser'
    }
  ];

  for (const userData of sampleUsers) {
    const hashedPassword = await bcrypt.hash('password123', 12);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        password: hashedPassword,
        currentCohortId: defaultCohort.id
      }
    });
    console.log(`👤 Sample user created: ${user.email}`);

    // Create cohort membership for the user
    await prisma.cohortMember.upsert({
      where: {
        userId_cohortId: {
          userId: user.id,
          cohortId: defaultCohort.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        cohortId: defaultCohort.id,
        status: 'ENROLLED',
        isActive: true
      }
    });
    console.log(`🎯 User ${user.email} enrolled in ${defaultCohort.name}`);
  }

  // Also ensure admin user is enrolled in default cohort
  await prisma.cohortMember.upsert({
    where: {
      userId_cohortId: {
        userId: adminUser.id,
        cohortId: defaultCohort.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      cohortId: defaultCohort.id,
      status: 'ENROLLED',
      isActive: true
    }
  });
  console.log(`👑 Admin user enrolled in ${defaultCohort.name}`);

  console.log('✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
