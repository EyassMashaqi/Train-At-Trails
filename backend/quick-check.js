const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickCheck() {
  try {
    // Check specifically the first two questions we know had issues
    const htmlQuestion = await prisma.question.findFirst({
      where: { title: 'HTML Fundamentals' },
      include: {
        contents: {
          include: {
            miniQuestions: {
              select: {
                title: true,
                isReleased: true
              }
            }
          }
        }
      }
    });
    
    const jsQuestion = await prisma.question.findFirst({
      where: { title: 'Modern JavaScript ES6+' },
      include: {
        contents: {
          include: {
            miniQuestions: {
              select: {
                title: true,
                isReleased: true
              }
            }
          }
        }
      }
    });
    
    console.log('🔍 HTML Fundamentals mini-questions:');
    htmlQuestion.contents.forEach(content => {
      content.miniQuestions.forEach(mq => {
        console.log(`  - ${mq.title}: Released = ${mq.isReleased}`);
      });
    });
    
    console.log('\n🔍 Modern JavaScript ES6+ mini-questions:');
    jsQuestion.contents.forEach(content => {
      content.miniQuestions.forEach(mq => {
        console.log(`  - ${mq.title}: Released = ${mq.isReleased}`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickCheck();
