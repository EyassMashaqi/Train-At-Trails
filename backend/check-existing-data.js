const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkExistingData() {
  try {
    const modules = await prisma.module.findMany({
      include: {
        questions: {
          include: {
            contents: {
              include: {
                miniQuestions: true
              }
            }
          }
        }
      }
    });
    
    console.log('Existing modules:', modules.length);
    
    for (const module of modules) {
      console.log(`\nModule: ${module.title} (${module.moduleNumber})`);
      console.log(`  Questions: ${module.questions.length}`);
      for (const question of module.questions) {
        console.log(`    - ${question.title} (Question #${question.questionNumber})`);
        console.log(`      Contents: ${question.contents.length}`);
        const totalMiniQuestions = question.contents.reduce((sum, content) => sum + content.miniQuestions.length, 0);
        console.log(`      Mini Questions: ${totalMiniQuestions}`);
      }
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkExistingData();
