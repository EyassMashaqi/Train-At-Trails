const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const questions = await prisma.question.count();
    const miniQuestions = await prisma.miniQuestion.count();
    const contents = await prisma.questionContent.count();
    const users = await prisma.user.count();
    
    console.log('Database Status:');
    console.log('- Questions:', questions);
    console.log('- Mini Questions:', miniQuestions);
    console.log('- Question Contents:', contents);
    console.log('- Users:', users);
    
    if (miniQuestions === 0) {
      console.log('\n⚠️  No mini questions found! Need to seed data.');
    } else {
      console.log('\n✅ Mini questions data exists');
      
      // Show sample mini question
      const sample = await prisma.miniQuestion.findFirst({
        include: {
          questionContent: {
            include: {
              question: true
            }
          }
        }
      });
      
      if (sample) {
        console.log('\nSample Mini Question:');
        console.log('- Title:', sample.title);
        console.log('- Question:', sample.question);
        console.log('- For Question:', sample.questionContent.question.title);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
