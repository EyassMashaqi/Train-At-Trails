const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testQuestionCount() {
  try {
    console.log('🔍 Connecting to database...');
    
    const totalQuestions = await prisma.question.count();
    console.log(`📊 Total questions in database: ${totalQuestions}`);
    
    const questions = await prisma.question.findMany({
      select: {
        id: true,
        questionNumber: true,
        title: true,
        releaseDate: true
      },
      orderBy: { questionNumber: 'asc' }
    });
    
    console.log('\n📋 Questions in database:');
    questions.forEach(q => {
      console.log(`  ${q.questionNumber}. ${q.title} (ID: ${q.id})`);
    });
    
    console.log(`\n✅ Verification: Database contains ${questions.length} questions`);
    console.log(`🎯 New totalSteps will be: ${totalQuestions}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuestionCount();
