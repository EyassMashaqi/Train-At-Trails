const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyCreatedData() {
  try {
    console.log('🔍 Verifying created modules and assignments...\n');
    
    const cohorts = await prisma.cohort.findMany({
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
      }
    });
    
    console.log(`Found ${cohorts.length} cohorts with modules:\n`);
    
    for (const cohort of cohorts) {
      console.log(`🏫 COHORT: ${cohort.name}`);
      console.log(`   ID: ${cohort.id}`);
      console.log(`   Modules: ${cohort.modules.length}\n`);
      
      for (const module of cohort.modules) {
        console.log(`  📚 MODULE ${module.moduleNumber}: ${module.title}`);
        console.log(`     Status: ${module.isReleased ? '🟢 Released' : '🔴 Not Released'}`);
        console.log(`     Active: ${module.isActive ? 'Yes' : 'No'}`);
        console.log(`     Release Date: ${module.releaseDate.toISOString().split('T')[0]}`);
        console.log(`     Assignments: ${module.questions.length}\n`);
        
        for (const question of module.questions) {
          console.log(`    📝 ASSIGNMENT ${question.questionNumber}: ${question.title}`);
          console.log(`       Status: ${question.isReleased ? '🟢 Released' : '🔴 Not Released'}`);
          console.log(`       Points: ${question.points} (Bonus: ${question.bonusPoints})`);
          console.log(`       Release Date: ${question.releaseDate.toISOString().split('T')[0]}`);
          console.log(`       Deadline: ${question.deadline.toISOString().split('T')[0]}`);
          console.log(`       Content Sections: ${question.contents.length}`);
          
          let totalMiniQuestions = 0;
          for (const content of question.contents) {
            console.log(`         📄 Content: ${content.title} (${content.miniQuestions.length} mini questions)`);
            totalMiniQuestions += content.miniQuestions.length;
            
            for (const miniQ of content.miniQuestions) {
              console.log(`           🔍 ${miniQ.title} - ${miniQ.isReleased ? '🟢 Released' : '🔴 Not Released'}`);
            }
          }
          console.log(`       Total Mini Questions: ${totalMiniQuestions}\n`);
        }
        console.log('   ' + '─'.repeat(60) + '\n');
      }
      console.log('═'.repeat(80) + '\n');
    }
    
    // Summary statistics
    const totalModules = await prisma.module.count();
    const totalQuestions = await prisma.question.count({ where: { moduleId: { not: null } } });
    const totalContents = await prisma.content.count();
    const totalMiniQuestions = await prisma.miniQuestion.count();
    
    console.log('📊 SUMMARY STATISTICS:');
    console.log(`   Total Cohorts: ${cohorts.length}`);
    console.log(`   Total Modules: ${totalModules}`);
    console.log(`   Total Assignments: ${totalQuestions}`);
    console.log(`   Total Content Sections: ${totalContents}`);
    console.log(`   Total Mini Questions: ${totalMiniQuestions}`);
    
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('   • All modules are created as UNRELEASED');
    console.log('   • All assignments are created as UNRELEASED'); 
    console.log('   • All mini questions are created as UNRELEASED');
    console.log('   • Release dates are set 30 days from now');
    console.log('   • Assignment deadlines are set 45 days from now');
    console.log('   • You can release them individually through the admin panel');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error verifying data:', error);
    await prisma.$disconnect();
  }
}

verifyCreatedData();
