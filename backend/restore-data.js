const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restoreDataToModules() {
  try {
    console.log('Starting data restoration to Module structure...');

    // First, let's check if we have any questions
    const questions = await prisma.question.findMany({
      orderBy: { questionNumber: 'asc' }
    });

    console.log(`Found ${questions.length} existing questions`);

    if (questions.length === 0) {
      console.log('No existing questions found. Creating sample data...');
      
      // Create sample modules and questions
      const modules = [
        {
          moduleNumber: 1,
          title: 'Foundation Adventure',
          description: 'Learn the basics and foundation skills'
        },
        {
          moduleNumber: 2,
          title: 'Intermediate Challenge',
          description: 'Build upon your knowledge with intermediate challenges'
        },
        {
          moduleNumber: 3,
          title: 'Advanced Mission',
          description: 'Master advanced concepts and techniques'
        }
      ];

      for (const moduleData of modules) {
        const module = await prisma.module.create({
          data: {
            moduleNumber: moduleData.moduleNumber,
            title: moduleData.title,
            description: moduleData.description,
            isActive: false,
            isReleased: false
          }
        });

        console.log(`Created module: ${module.title}`);

        // Create sample questions for each module
        for (let topicNum = 1; topicNum <= 4; topicNum++) {
          const questionNumber = (moduleData.moduleNumber - 1) * 4 + topicNum;
          
          const question = await prisma.question.create({
            data: {
              questionNumber: questionNumber,
              title: `${moduleData.title} - Topic ${topicNum}`,
              content: `This is the content for topic ${topicNum} in ${moduleData.title}. Please provide a detailed response.`,
              description: `Topic ${topicNum} assignment for ${moduleData.title}`,
              deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              points: 100,
              bonusPoints: 50,
              isActive: false,
              isReleased: topicNum === 1, // Release first topic of each module
              moduleId: module.id,
              topicNumber: topicNum
            }
          });

          console.log(`  - Created question: ${question.title}`);
        }
      }
    } else {
      console.log('Organizing existing questions into modules...');

      // Group existing questions by some logic (every 4 questions = 1 module)
      const moduleGroups = {};
      questions.forEach(question => {
        const moduleNum = Math.ceil(question.questionNumber / 4);
        if (!moduleGroups[moduleNum]) {
          moduleGroups[moduleNum] = [];
        }
        moduleGroups[moduleNum].push(question);
      });

      // Create modules for existing questions
      for (const [moduleNum, moduleQuestions] of Object.entries(moduleGroups)) {
        const moduleNumber = parseInt(moduleNum);
        
        // Check if module already exists
        let module = await prisma.module.findUnique({
          where: { moduleNumber }
        });

        if (!module) {
          module = await prisma.module.create({
            data: {
              moduleNumber: moduleNumber,
              title: `Adventure ${moduleNumber}`,
              description: `Training module ${moduleNumber}`,
              isActive: false,
              isReleased: false
            }
          });
          console.log(`Created module: ${module.title}`);
        }

        // Update questions to reference this module
        for (let i = 0; i < moduleQuestions.length; i++) {
          const question = moduleQuestions[i];
          await prisma.question.update({
            where: { id: question.id },
            data: {
              moduleId: module.id,
              topicNumber: i + 1
            }
          });
        }

        console.log(`Linked ${moduleQuestions.length} questions to ${module.title}`);
      }
    }

    // Create sample users if none exist
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('Creating sample users...');
      
      // Demo accounts specification
      const bcrypt = require('bcrypt');
      const demoAccounts = [
        {
          email: 'admin@traintrails.com',
          password: 'admin123',
          fullName: 'System Administrator',
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
          currentStep: 2
        },
        {
          email: 'bob@traintrails.com',
          password: 'password123',
          fullName: 'Bob Smith',
          trainName: 'Thunder Rail',
          isAdmin: false,
          currentStep: 1
        },
        {
          email: 'test@traintrails.com',
          password: 'test123',
          fullName: 'Test User',
          trainName: 'Test Express',
          isAdmin: false,
          currentStep: 0
        }
      ];

      for (const userData of demoAccounts) {
        // Hash the password properly
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        await prisma.user.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            fullName: userData.fullName,
            trainName: userData.trainName,
            isAdmin: userData.isAdmin,
            currentStep: userData.currentStep
          }
        });
        console.log(`Created user: ${userData.fullName} (${userData.email})`);
      }
    }

    console.log('Data restoration completed successfully!');
    
    // Show final summary
    const finalModules = await prisma.module.findMany({
      include: {
        questions: true
      }
    });
    
    const finalUsers = await prisma.user.count({
      where: { isAdmin: false }
    });

    console.log('\n=== FINAL SUMMARY ===');
    console.log(`Total modules: ${finalModules.length}`);
    finalModules.forEach(module => {
      console.log(`- ${module.title}: ${module.questions.length} questions`);
    });
    console.log(`Total users: ${finalUsers}`);

  } catch (error) {
    console.error('Data restoration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreDataToModules();
