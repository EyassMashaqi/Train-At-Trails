const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkQuestions() {
  try {
    console.log('🔍 Checking questions status...\n');
    
    const questions = await prisma.question.findMany({
      select: {
        id: true,
        title: true,
        isReleased: true,
        questionNumber: true
      },
      orderBy: { questionNumber: 'asc' }
    });
    
    console.log('Current questions status:');
    questions.forEach(q => {
      console.log(`Q${q.questionNumber}: ${q.title} - Released: ${q.isReleased}`);
    });
    
    console.log('\n🔍 Checking mini-questions for unreleased questions...\n');
    
    const unreleasedQuestions = questions.filter(q => !q.isReleased);
    
    for (const question of unreleasedQuestions) {
      const miniQuestions = await prisma.content.findMany({
        where: { questionId: question.id },
        include: {
          miniQuestions: {
            select: {
              id: true,
              title: true,
              description: true,
              isReleased: true
            }
          }
        }
      });
      
      console.log(`\n📋 Question: ${question.title} (Released: ${question.isReleased})`);
      miniQuestions.forEach(content => {
        content.miniQuestions.forEach(mq => {
          console.log(`  - Mini Q: ${mq.title} | ${mq.description} (Released: ${mq.isReleased})`);
        });
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkQuestions();
