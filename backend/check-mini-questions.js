const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMiniQuestions() {
  try {
    console.log('🔍 Checking mini-questions...\n');
    
    // Check all mini questions
    const allMiniQuestions = await prisma.miniQuestion.findMany({
      include: {
        content: {
          include: {
            question: {
              select: { title: true, questionNumber: true, isReleased: true }
            }
          }
        }
      }
    });
    
    console.log(`📝 Total mini-questions: ${allMiniQuestions.length}`);
    allMiniQuestions.forEach((mq, i) => {
      console.log(`  ${i+1}. "${mq.title}"`);
      console.log(`     - Question: ${mq.question || 'N/A'}`);
      console.log(`     - Released: ${mq.isReleased}`);
      console.log(`     - Release Date: ${mq.releaseDate || 'Not set'}`);
      console.log(`     - Parent Question: "${mq.content?.question?.title || 'N/A'}" (Released: ${mq.content?.question?.isReleased || 'N/A'})`);
      console.log('');
    });
    
    // Check contents
    const contents = await prisma.content.findMany({
      include: {
        question: {
          select: { title: true, questionNumber: true }
        },
        miniQuestions: true
      }
    });
    
    console.log(`📋 Total content sections: ${contents.length}`);
    contents.forEach((content, i) => {
      console.log(`  ${i+1}. "${content.title}" (Question: "${content.question?.title || 'N/A'}")`);
      console.log(`     - Mini-questions: ${content.miniQuestions?.length || 0}`);
    });
    
    // Check current date vs release dates
    const now = new Date();
    console.log(`\n🕒 Current time: ${now.toISOString()}`);
    console.log('\n⏰ Mini-questions that should be released:');
    
    const shouldBeReleased = allMiniQuestions.filter(mq => 
      mq.releaseDate && new Date(mq.releaseDate) <= now
    );
    
    console.log(`Found ${shouldBeReleased.length} mini-questions that should be released:`);
    shouldBeReleased.forEach(mq => {
      const releaseDate = new Date(mq.releaseDate);
      console.log(`  - "${mq.title}" (Release: ${releaseDate.toISOString()}, Currently Released: ${mq.isReleased})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMiniQuestions();
