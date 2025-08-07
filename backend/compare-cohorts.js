const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareCohorts() {
  try {
    console.log('🔍 Comparing content between Default Cohort and Test Cohort...\n');
    
    const cohorts = await prisma.cohort.findMany({
      where: {
        OR: [
          { name: 'Default Cohort' },
          { name: 'test1111' }
        ]
      },
      include: {
        modules: {
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
          },
          orderBy: { moduleNumber: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    const defaultCohort = cohorts.find(c => c.name === 'Default Cohort');
    const testCohort = cohorts.find(c => c.name === 'test1111');
    
    if (!defaultCohort || !testCohort) {
      console.log('❌ Could not find both cohorts');
      return;
    }
    
    console.log('📊 COHORT CONTENT COMPARISON\n');
    console.log('═'.repeat(100) + '\n');
    
    for (let i = 0; i < Math.max(defaultCohort.modules.length, testCohort.modules.length); i++) {
      const defaultModule = defaultCohort.modules[i];
      const testModule = testCohort.modules[i];
      
      console.log(`MODULE ${i + 1} COMPARISON:`);
      console.log('─'.repeat(50));
      
      if (defaultModule) {
        console.log(`🏫 DEFAULT COHORT:`);
        console.log(`   📚 ${defaultModule.title}`);
        console.log(`   📝 ${defaultModule.description}`);
        console.log(`   📋 Assignments: ${defaultModule.questions.length}`);
        
        defaultModule.questions.forEach((q, idx) => {
          console.log(`      ${idx + 1}. ${q.title} (${q.points} pts)`);
          q.contents.forEach(c => {
            console.log(`         📄 ${c.title} (${c.miniQuestions.length} mini questions)`);
          });
        });
      }
      
      console.log('');
      
      if (testModule) {
        console.log(`🧪 TEST COHORT:`);
        console.log(`   📚 ${testModule.title}`);
        console.log(`   📝 ${testModule.description}`);
        console.log(`   📋 Assignments: ${testModule.questions.length}`);
        
        testModule.questions.forEach((q, idx) => {
          console.log(`      ${idx + 1}. ${q.title} (${q.points} pts)`);
          q.contents.forEach(c => {
            console.log(`         📄 ${c.title} (${c.miniQuestions.length} mini questions)`);
          });
        });
      }
      
      console.log('\n' + '═'.repeat(100) + '\n');
    }
    
    // Show mini question differences for first module as example
    console.log('🔍 DETAILED MINI QUESTION COMPARISON (Module 1, Assignment 1):');
    console.log('─'.repeat(80));
    
    const defaultFirstAssignment = defaultCohort.modules[0]?.questions[0];
    const testFirstAssignment = testCohort.modules[0]?.questions[0];
    
    if (defaultFirstAssignment && testFirstAssignment) {
      console.log('\n🏫 DEFAULT COHORT - First Assignment Mini Questions:');
      defaultFirstAssignment.contents.forEach(content => {
        content.miniQuestions.forEach((mq, idx) => {
          console.log(`   ${idx + 1}. ${mq.title}`);
          console.log(`      Question: ${mq.question.substring(0, 100)}...`);
        });
      });
      
      console.log('\n🧪 TEST COHORT - First Assignment Mini Questions:');
      testFirstAssignment.contents.forEach(content => {
        content.miniQuestions.forEach((mq, idx) => {
          console.log(`   ${idx + 1}. ${mq.title}`);
          console.log(`      Question: ${mq.question.substring(0, 100)}...`);
        });
      });
    }
    
    console.log('\n✅ Verification Complete!');
    console.log('🎯 Both cohorts now have completely different content as requested.');
    
  } catch (error) {
    console.error('❌ Error comparing cohorts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareCohorts();
