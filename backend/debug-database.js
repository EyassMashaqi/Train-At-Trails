const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugDatabase() {
  try {
    console.log('🔍 Debugging database state...\n');
    
    // Check all questions
    const allQuestions = await prisma.question.findMany({
      include: {
        module: {
          select: { title: true, moduleNumber: true, isReleased: true }
        }
      }
    });
    
    console.log(`📝 Total questions: ${allQuestions.length}`);
    allQuestions.forEach((q, i) => {
      console.log(`  ${i+1}. "${q.title}" (ID: ${q.id})`);
      console.log(`     - Question Number: ${q.questionNumber}`);
      console.log(`     - Released: ${q.isReleased}`);
      console.log(`     - Module ID: ${q.moduleId || 'NULL'}`);
      console.log(`     - Topic Number: ${q.topicNumber || 'NULL'}`);
      if (q.module) {
        console.log(`     - Module: "${q.module.title}" (Released: ${q.module.isReleased})`);
      }
      console.log('');
    });
    
    // Check modules
    const modules = await prisma.module.findMany();
    console.log(`📚 Total modules: ${modules.length}`);
    modules.forEach((m, i) => {
      console.log(`  ${i+1}. "${m.title}" (Released: ${m.isReleased})`);
    });
    
    // Test the exact query used in the backend
    console.log('\n🔍 Testing backend query for totalSteps...');
    const totalQuestions = await prisma.question.count({
      where: { 
        isReleased: true,
        moduleId: { not: null },
        topicNumber: { not: null },
        module: {
          isReleased: true
        }
      }
    });
    console.log(`✅ Backend query result: ${totalQuestions} assignments`);
    
    // Test without module requirement
    const releasedQuestions = await prisma.question.count({
      where: { 
        isReleased: true
      }
    });
    console.log(`📊 All released questions: ${releasedQuestions}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDatabase();
