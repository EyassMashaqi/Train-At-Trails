const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMiniAnswerStructure() {
  try {
    console.log('🔍 CHECKING MINI-ANSWER DATA STRUCTURE\n');

    // Get all mini-answers for test user
    const miniAnswers = await prisma.miniAnswer.findMany({
      where: {
        user: {
          email: 'test@traintrails.com'
        }
      },
      orderBy: { submittedAt: 'asc' }
    });

    console.log(`📝 Found ${miniAnswers.length} mini-answers:\n`);
    
    miniAnswers.forEach((answer, index) => {
      console.log(`${index + 1}. Mini-Answer ID: ${answer.id}`);
      console.log(`   User ID: ${answer.userId}`);
      console.log(`   Mini-Question ID: ${answer.miniQuestionId}`);
      console.log(`   Answer: ${answer.answer || 'No answer'}`);
      console.log(`   Link: ${answer.link || 'No link'}`);
      console.log(`   Notes: ${answer.notes || 'No notes'}`);
      console.log(`   Status: ${answer.status || 'No status'}`);
      console.log(`   Submitted At: ${answer.submittedAt}`);
      console.log(`   Created At: ${answer.createdAt}`);
      console.log(`   Updated At: ${answer.updatedAt}`);
      console.log();
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMiniAnswerStructure();
