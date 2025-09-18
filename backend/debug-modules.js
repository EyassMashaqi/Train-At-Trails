const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugModuleUpdates() {
  try {
    console.log('🔍 Debugging module update functionality...\n');
    
    // Check existing modules
    const modules = await (prisma).module.findMany({
      orderBy: { moduleNumber: 'asc' }
    });
    
    console.log(`📊 Found ${modules.length} modules in database:`);
    modules.forEach(module => {
      console.log(`   - Module ${module.moduleNumber}: "${module.title}"`);
      console.log(`     ID: ${module.id}`);
      console.log(`     Description: ${module.description}`);
      console.log(`     Active: ${module.isActive}, Released: ${module.isReleased}`);
      console.log('');
    });
    
    // Check questions and their module numbers
    const questions = await prisma.question.findMany({
      orderBy: { questionNumber: 'asc' },
      select: {
        id: true,
        questionNumber: true,
        title: true,
        moduleNumber: true,
        topicNumber: true,
        isReleased: true,
        cohortId: true
      }
    });
    
    console.log(`📋 Found ${questions.length} questions (assignments):`);
    questions.forEach(question => {
      console.log(`   - Q${question.questionNumber}: "${question.title}"`);
      console.log(`     Module: ${question.moduleNumber}, Topic: ${question.topicNumber}`);
      console.log(`     Released: ${question.isReleased}, Cohort: ${question.cohortId}`);
      console.log('');
    });
    
    // Test basic module update
    if (modules.length > 0) {
      const testModule = modules[0];
      console.log(`🧪 Testing module update on: "${testModule.title}"`);
      
      try {
        const updateResult = await (prisma).module.update({
          where: { id: testModule.id },
          data: {
            description: `Updated at ${new Date().toISOString()}`
          }
        });
        
        console.log('✅ Module update test successful');
        console.log(`   New description: ${updateResult.description}`);
      } catch (updateError) {
        console.error('❌ Module update test failed:', updateError);
      }
    }
    
    // Test basic question update  
    if (questions.length > 0) {
      const testQuestion = questions[0];
      console.log(`\n🧪 Testing question update on: "${testQuestion.title}"`);
      
      try {
        const updateResult = await prisma.question.update({
          where: { id: testQuestion.id },
          data: {
            description: `Updated at ${new Date().toISOString()}`
          }
        });
        
        console.log('✅ Question update test successful');
        console.log(`   New description: ${updateResult.description}`);
      } catch (updateError) {
        console.error('❌ Question update test failed:', updateError);
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging modules:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugModuleUpdates();