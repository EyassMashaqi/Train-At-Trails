const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function restoreUsers() {
  console.log('🚂 Restoring Train at Trails data...');

  try {
    // Create default cohort
    const defaultCohort = await prisma.cohort.upsert({
      where: { name: 'Default Cohort' },
      update: {},
      create: {
        name: 'Default Cohort',
        description: 'Main training cohort',
        startDate: new Date(),
        isActive: true
      }
    });
    console.log('✅ Default cohort created');

    // Create cohort game config
    await prisma.cohortGameConfig.upsert({
      where: { cohortId: defaultCohort.id },
      update: {},
      create: {
        cohortId: defaultCohort.id,
        questionReleaseIntervalHours: 48,
        totalQuestions: 12,
        gameStartDate: new Date()
      }
    });
    console.log('✅ Cohort game config created');

    // Create users
    const users = [
      {
        email: 'admin@traintrails.com',
        password: 'admin123',
        fullName: 'Admin User',
        trainName: 'Express Admin',
        isAdmin: true
      },
      {
        email: 'alice@traintrails.com',
        password: 'alice123',
        fullName: 'Alice Johnson',
        trainName: 'Adventure Express',
        isAdmin: false
      },
      {
        email: 'bob@traintrails.com',
        password: 'bob123',
        fullName: 'Bob Smith',
        trainName: 'Cargo Master',
        isAdmin: false
      },
      {
        email: 'test@traintrails.com',
        password: 'test123',
        fullName: 'Test User',
        trainName: 'Test Train',
        isAdmin: false
      }
    ];

    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          email: userData.email,
          password: hashedPassword,
          fullName: userData.fullName,
          trainName: userData.trainName,
          isAdmin: userData.isAdmin
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
        update: {},
        create: {
          userId: user.id,
          cohortId: defaultCohort.id,
          currentStep: 0,
          isActive: true
        }
      });
      
      console.log(`✅ User created: ${userData.email}`);
    }

    // Create sample modules
    const modules = [
      { moduleNumber: 1, title: 'Getting Started', description: 'Introduction to the trail' },
      { moduleNumber: 2, title: 'First Steps', description: 'Taking your first steps on the journey' },
      { moduleNumber: 3, title: 'Building Momentum', description: 'Gaining speed and confidence' }
    ];

    for (const moduleData of modules) {
      await prisma.module.upsert({
        where: {
          moduleNumber_cohortId: {
            moduleNumber: moduleData.moduleNumber,
            cohortId: defaultCohort.id
          }
        },
        update: {},
        create: {
          moduleNumber: moduleData.moduleNumber,
          title: moduleData.title,
          description: moduleData.description,
          isActive: true,
          isReleased: true,
          releaseDate: new Date(),
          releasedAt: new Date(),
          cohortId: defaultCohort.id
        }
      });
    }
    console.log('✅ Sample modules created');

    // Create sample questions
    const sampleQuestions = [
      {
        questionNumber: 1,
        title: 'Welcome Aboard!',
        content: 'Tell us about yourself and why you joined this training journey.',
        description: 'Introduce yourself to the community',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        points: 100,
        bonusPoints: 50,
        isActive: true,
        isReleased: true,
        releaseDate: new Date(),
        releasedAt: new Date(),
        moduleId: null,
        topicNumber: 1
      },
      {
        questionNumber: 2,
        title: 'Your First Challenge',
        content: 'Describe a recent challenge you faced and how you overcame it.',
        description: 'Share your problem-solving experience',
        deadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
        points: 100,
        bonusPoints: 50,
        isActive: true,
        isReleased: false,
        releaseDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        releasedAt: null,
        moduleId: null,
        topicNumber: 2
      }
    ];

    const createdQuestions = [];
    for (const questionData of sampleQuestions) {
      const question = await prisma.question.upsert({
        where: {
          questionNumber_cohortId: {
            questionNumber: questionData.questionNumber,
            cohortId: defaultCohort.id
          }
        },
        update: {},
        create: {
          ...questionData,
          cohortId: defaultCohort.id
        }
      });
      createdQuestions.push(question);
    }
    console.log('✅ Sample questions created');

    // Create sample answers
    const users_list = await prisma.user.findMany({
      where: { isAdmin: false }
    });

    if (users_list.length > 0 && createdQuestions.length > 0) {
      // Alice's answer to question 1
      const alice = users_list.find(u => u.email === 'alice@traintrails.com');
      if (alice) {
        await prisma.answer.upsert({
          where: {
            userId_questionId_cohortId: {
              userId: alice.id,
              questionId: createdQuestions[0].id,
              cohortId: defaultCohort.id
            }
          },
          update: {},
          create: {
            content: "Hi everyone! I'm Alice, a software developer passionate about learning new technologies. I joined this training to enhance my problem-solving skills and connect with like-minded individuals. Looking forward to this journey!",
            status: "APPROVED",
            pointsAwarded: 100,
            reviewedAt: new Date(),
            reviewedBy: "admin@traintrails.com",
            feedback: "Great introduction! Welcome to the journey.",
            userId: alice.id,
            questionId: createdQuestions[0].id,
            cohortId: defaultCohort.id
          }
        });
        console.log('✅ Sample answer created for Alice');
      }

      // Bob's answer to question 1
      const bob = users_list.find(u => u.email === 'bob@traintrails.com');
      if (bob) {
        await prisma.answer.upsert({
          where: {
            userId_questionId_cohortId: {
              userId: bob.id,
              questionId: createdQuestions[0].id,
              cohortId: defaultCohort.id
            }
          },
          update: {},
          create: {
            content: "Hello! I'm Bob, an aspiring entrepreneur. I believe continuous learning is key to success, and I'm excited to be part of this community. Ready to tackle the challenges ahead!",
            status: "PENDING",
            userId: bob.id,
            questionId: createdQuestions[0].id,
            cohortId: defaultCohort.id
          }
        });
        console.log('✅ Sample answer created for Bob');
      }
    }

    console.log('🎉 Data restoration complete!');
    console.log('\n📋 User Accounts:');
    console.log('Admin: admin@traintrails.com / admin123');
    console.log('Alice: alice@traintrails.com / alice123');
    console.log('Bob: bob@traintrails.com / bob123');
    console.log('Test: test@traintrails.com / test123');

  } catch (error) {
    console.error('❌ Error restoring data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreUsers();
