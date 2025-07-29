const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateToModules() {
  try {
    console.log('Starting migration to Module structure...');

    // Get all existing questions
    const questions = await prisma.question.findMany({
      orderBy: { questionNumber: 'asc' }
    });

    if (questions.length === 0) {
      console.log('No questions found. Creating default modules...');
      
      // Create 3 default modules
      for (let i = 1; i <= 3; i++) {
        await prisma.module.create({
          data: {
            moduleNumber: i,
            title: `Adventure ${i}`,
            description: `Training module ${i} - Learn and explore new challenges`,
            isActive: false,
            isReleased: false
          }
        });
        console.log(`Created Module ${i}`);
      }
    } else {
      console.log(`Found ${questions.length} questions to migrate`);

      // Create modules for existing questions
      const moduleNumbers = [...new Set(questions.map(q => Math.ceil(q.questionNumber / 4) || 1))];
      
      for (const moduleNum of moduleNumbers) {
        try {
          const module = await prisma.module.create({
            data: {
              moduleNumber: moduleNum,
              title: `Adventure ${moduleNum}`,
              description: `Training module ${moduleNum}`,
              isActive: false,
              isReleased: false
            }
          });

          // Update questions to reference this module
          const moduleQuestions = questions.filter(q => Math.ceil(q.questionNumber / 4) === moduleNum);
          
          for (const question of moduleQuestions) {
            await prisma.question.update({
              where: { id: question.id },
              data: {
                moduleId: module.id,
                topicNumber: ((question.questionNumber - 1) % 4) + 1
              }
            });
          }

          console.log(`Created Module ${moduleNum} with ${moduleQuestions.length} questions`);
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`Module ${moduleNum} already exists, skipping...`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateToModules();
