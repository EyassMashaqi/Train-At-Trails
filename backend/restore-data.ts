import { PrismaClient } from '@prisma/client';
// @ts-ignore
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function restoreAllData() {
  console.log('🔄 Restoring all data...');

  try {
    // Create default cohort first (should already exist, but just in case)
    const defaultCohort = await prisma.cohort.upsert({
      where: { name: 'Default Cohort' },
      update: {},
      create: {
        name: 'Default Cohort',
        description: 'Default cohort for existing data and new users',
        startDate: new Date('2025-01-01'),
        isActive: true
      }
    });

    console.log(`✅ Default cohort: ${defaultCohort.name}`);

    // Create default cohort game config
    await prisma.cohortGameConfig.upsert({
      where: { cohortId: defaultCohort.id },
      update: {},
      create: {
        cohortId: defaultCohort.id,
        questionReleaseIntervalHours: 48,
        totalQuestions: 12,
        gameStartDate: new Date('2025-01-01')
      }
    });

    // Create users
    const users = [
      {
        email: 'admin@traintrails.com',
        password: 'admin123',
        fullName: 'Admin User',
        trainName: 'Admin Express',
        isAdmin: true,
        currentStep: 0
      },
      {
        email: 'alice@traintrails.com',
        password: 'password123',
        fullName: 'Alice Johnson',
        trainName: 'Lightning Express',
        isAdmin: false,
        currentStep: 3
      },
      {
        email: 'bob@traintrails.com',
        password: 'password123',
        fullName: 'Bob Smith',
        trainName: 'Thunder Rails',
        isAdmin: false,
        currentStep: 2
      },
      {
        email: 'test@traintrails.com',
        password: 'test123',
        fullName: 'Test User',
        trainName: 'Testing Train',
        isAdmin: false,
        currentStep: 1
      }
    ];

    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          fullName: userData.fullName,
          trainName: userData.trainName,
          isAdmin: userData.isAdmin,
          currentStep: userData.currentStep
        },
        create: {
          email: userData.email,
          password: hashedPassword,
          fullName: userData.fullName,
          trainName: userData.trainName,
          isAdmin: userData.isAdmin,
          currentStep: userData.currentStep
        }
      });

      // Add user to default cohort
      await prisma.cohortMember.upsert({
        where: {
          userId_cohortId: {
            userId: user.id,
            cohortId: defaultCohort.id
          }
        },
        update: {
          currentStep: userData.currentStep,
          isActive: true
        },
        create: {
          userId: user.id,
          cohortId: defaultCohort.id,
          currentStep: userData.currentStep,
          isActive: true
        }
      });

      console.log(`✅ Created/Updated user: ${userData.fullName} (${userData.email})`);
    }

    // Create modules
    const modules = [
      {
        moduleNumber: 1,
        title: 'Getting Started',
        description: 'Introduction to the journey and basic concepts',
        isActive: true,
        isReleased: true,
        releaseDate: new Date('2025-01-01'),
        releasedAt: new Date('2025-01-01')
      },
      {
        moduleNumber: 2,
        title: 'Building Foundations',
        description: 'Essential skills and knowledge building',
        isActive: true,
        isReleased: true,
        releaseDate: new Date('2025-01-03'),
        releasedAt: new Date('2025-01-03')
      },
      {
        moduleNumber: 3,
        title: 'Advanced Concepts',
        description: 'Deep dive into complex topics',
        isActive: true,
        isReleased: false,
        releaseDate: new Date('2025-01-05')
      }
    ];

    for (const moduleData of modules) {
      await prisma.module.upsert({
        where: {
          moduleNumber_cohortId: {
            moduleNumber: moduleData.moduleNumber,
            cohortId: defaultCohort.id
          }
        },
        update: {
          title: moduleData.title,
          description: moduleData.description,
          isActive: moduleData.isActive,
          isReleased: moduleData.isReleased,
          releaseDate: moduleData.releaseDate,
          releasedAt: moduleData.releasedAt
        },
        create: {
          moduleNumber: moduleData.moduleNumber,
          title: moduleData.title,
          description: moduleData.description,
          isActive: moduleData.isActive,
          isReleased: moduleData.isReleased,
          releaseDate: moduleData.releaseDate,
          releasedAt: moduleData.releasedAt,
          cohortId: defaultCohort.id
        }
      });

      console.log(`✅ Created/Updated module: ${moduleData.title}`);
    }

    // Create questions
    const questions = [
      {
        questionNumber: 1,
        title: 'Welcome to the Journey',
        content: 'This is your first question to get started on the trail.',
        description: 'Answer this question to begin your adventure and take your first step forward.',
        deadline: new Date('2025-02-01'),
        points: 100,
        bonusPoints: 50,
        isActive: true,
        isReleased: true,
        releaseDate: new Date('2025-01-01'),
        releasedAt: new Date('2025-01-01'),
        moduleId: null, // Will be set after module creation
        topicNumber: 1
      },
      {
        questionNumber: 2,
        title: 'Building Your Foundation',
        content: 'Now that you\'ve started, let\'s build a solid foundation for your journey.',
        description: 'This question focuses on establishing key concepts and understanding.',
        deadline: new Date('2025-02-15'),
        points: 100,
        bonusPoints: 50,
        isActive: true,
        isReleased: true,
        releaseDate: new Date('2025-01-03'),
        releasedAt: new Date('2025-01-03'),
        moduleId: null,
        topicNumber: 2
      },
      {
        questionNumber: 3,
        title: 'Exploring New Territories',
        content: 'Time to explore new concepts and expand your knowledge.',
        description: 'This question challenges you to think beyond the basics.',
        deadline: new Date('2025-03-01'),
        points: 100,
        bonusPoints: 50,
        isActive: true,
        isReleased: true,
        releaseDate: new Date('2025-01-05'),
        releasedAt: new Date('2025-01-05'),
        moduleId: null,
        topicNumber: 3
      }
    ];

    for (const questionData of questions) {
      await prisma.question.upsert({
        where: {
          questionNumber_cohortId: {
            questionNumber: questionData.questionNumber,
            cohortId: defaultCohort.id
          }
        },
        update: {
          title: questionData.title,
          content: questionData.content,
          description: questionData.description,
          deadline: questionData.deadline,
          points: questionData.points,
          bonusPoints: questionData.bonusPoints,
          isActive: questionData.isActive,
          isReleased: questionData.isReleased,
          releaseDate: questionData.releaseDate,
          releasedAt: questionData.releasedAt,
          topicNumber: questionData.topicNumber
        },
        create: {
          questionNumber: questionData.questionNumber,
          title: questionData.title,
          content: questionData.content,
          description: questionData.description,
          deadline: questionData.deadline,
          points: questionData.points,
          bonusPoints: questionData.bonusPoints,
          isActive: questionData.isActive,
          isReleased: questionData.isReleased,
          releaseDate: questionData.releaseDate,
          releasedAt: questionData.releasedAt,
          cohortId: defaultCohort.id,
          topicNumber: questionData.topicNumber
        }
      });

      console.log(`✅ Created/Updated question: ${questionData.title}`);
    }

    // Create some sample content and mini questions
    const questions = await prisma.question.findMany({
      where: { cohortId: defaultCohort.id },
      orderBy: { questionNumber: 'asc' },
      take: 2
    });

    if (questions.length > 0) {
      // Create content for first question
      const content1 = await prisma.content.upsert({
        where: { id: 'content-1-default' },
        update: {},
        create: {
          id: 'content-1-default',
          title: 'Introduction Materials',
          material: 'Welcome to your learning journey! This section contains important introductory materials and resources.',
          orderIndex: 1,
          isActive: true,
          questionId: questions[0].id
        }
      });

      // Create mini questions for the content
      const miniQuestions = [
        {
          title: 'Research Activity 1',
          question: 'Find and share a relevant article or resource related to the topic',
          description: 'Look for recent articles, blogs, or resources that relate to our current topic',
          releaseDate: new Date('2025-01-01'),
          isReleased: true,
          actualReleaseDate: new Date('2025-01-01'),
          orderIndex: 1,
          contentId: content1.id
        },
        {
          title: 'Video Resource',
          question: 'Find an educational video that explains the key concepts',
          description: 'Search for tutorial videos or educational content that helps explain the topic',
          releaseDate: new Date('2025-01-01'),
          isReleased: true,
          actualReleaseDate: new Date('2025-01-01'),
          orderIndex: 2,
          contentId: content1.id
        }
      ];

      for (const miniQuestionData of miniQuestions) {
        await prisma.miniQuestion.create({
          data: miniQuestionData
        });

        console.log(`✅ Created mini question: ${miniQuestionData.title}`);
      }
    }

    // Create some sample answers to show progress
    const alice = await prisma.user.findUnique({ where: { email: 'alice@traintrails.com' } });
    const bob = await prisma.user.findUnique({ where: { email: 'bob@traintrails.com' } });

    if (alice && questions.length > 0) {
      // Alice has answered question 1 and 2
      for (let i = 0; i < Math.min(2, questions.length); i++) {
        await prisma.answer.upsert({
          where: {
            userId_questionId_cohortId: {
              userId: alice.id,
              questionId: questions[i].id,
              cohortId: defaultCohort.id
            }
          },
          update: {},
          create: {
            content: `This is Alice's answer to question ${i + 1}. She has provided a detailed response showing her understanding of the topic.`,
            status: 'APPROVED',
            submittedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000), // Submitted days ago
            reviewedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            feedback: 'Great work! Your understanding is clear and well-articulated.',
            pointsAwarded: 100,
            userId: alice.id,
            questionId: questions[i].id,
            cohortId: defaultCohort.id
          }
        });
      }
      console.log(`✅ Created sample answers for Alice`);
    }

    if (bob && questions.length > 0) {
      // Bob has answered question 1
      await prisma.answer.upsert({
        where: {
          userId_questionId_cohortId: {
            userId: bob.id,
            questionId: questions[0].id,
            cohortId: defaultCohort.id
          }
        },
        update: {},
        create: {
          content: `This is Bob's answer to question 1. He shows good effort and understanding.`,
          status: 'APPROVED',
          submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          reviewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          feedback: 'Good start! Keep up the good work.',
          pointsAwarded: 100,
          userId: bob.id,
          questionId: questions[0].id,
          cohortId: defaultCohort.id
        }
      });
      console.log(`✅ Created sample answer for Bob`);
    }

    // Update global game config
    await prisma.gameConfig.upsert({
      where: { id: 'singleton' },
      update: {
        questionReleaseIntervalHours: 48,
        totalQuestions: 12,
        gameStartDate: new Date('2025-01-01')
      },
      create: {
        id: 'singleton',
        questionReleaseIntervalHours: 48,
        totalQuestions: 12,
        gameStartDate: new Date('2025-01-01')
      }
    });

    console.log('✅ Updated game configuration');

    console.log('🎉 All data has been restored successfully!');
    console.log('');
    console.log('👥 Available Users:');
    console.log('   Admin: admin@traintrails.com / admin123');
    console.log('   Alice: alice@traintrails.com / password123 (Step 3)');
    console.log('   Bob: bob@traintrails.com / password123 (Step 2)');
    console.log('   Test: test@traintrails.com / test123 (Step 1)');
    console.log('');
    console.log('🏫 Default Cohort created with sample modules and questions');
    console.log('📝 Sample answers created to show progress');
    console.log('');

  } catch (error) {
    console.error('❌ Error restoring data:', error);
    throw error;
  }
}

// Run the restore function
restoreAllData()
  .catch((error) => {
    console.error('❌ Data restoration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
