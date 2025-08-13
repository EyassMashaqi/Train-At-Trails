// Check what was copied
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCopiedData() {
  try {
    console.log('🔍 Checking copied cohort data...');
    
    // Find the copied cohort
    const copiedCohort = await prisma.cohort.findFirst({
      where: { name: 'Debug Copy Test' },
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
          }
        },
        questions: {
          include: {
            contents: {
              include: {
                miniQuestions: true
              }
            }
          }
        }
      }
    });
    
    if (!copiedCohort) {
      console.log('❌ Copied cohort not found');
      return;
    }
    
    console.log(`✅ Found copied cohort: #${copiedCohort.cohortNumber} ${copiedCohort.name}`);
    console.log(`📊 Modules: ${copiedCohort.modules.length}`);
    console.log(`📊 Questions: ${copiedCohort.questions.length}`);
    
    let totalContents = 0;
    let totalMiniQuestions = 0;
    
    // Count contents and mini questions in modules
    copiedCohort.modules.forEach(module => {
      console.log(`  📚 Module: ${module.title} (${module.questions.length} questions)`);
      module.questions.forEach(question => {
        totalContents += question.contents.length;
        question.contents.forEach(content => {
          totalMiniQuestions += content.miniQuestions.length;
        });
      });
    });
    
    // Count contents and mini questions in standalone questions
    copiedCohort.questions.forEach(question => {
      if (!question.moduleId) {
        console.log(`  📋 Standalone Question: ${question.title} (${question.contents.length} contents)`);
        totalContents += question.contents.length;
        question.contents.forEach(content => {
          totalMiniQuestions += content.miniQuestions.length;
        });
      }
    });
    
    console.log(`📊 Total Contents: ${totalContents}`);
    console.log(`📊 Total Mini Questions: ${totalMiniQuestions}`);
    
    // Compare with original
    const originalCohort = await prisma.cohort.findFirst({
      where: { name: 'test1111' },
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
          }
        },
        questions: {
          include: {
            contents: {
              include: {
                miniQuestions: true
              }
            }
          }
        }
      }
    });
    
    if (originalCohort) {
      let origContents = 0;
      let origMiniQuestions = 0;
      
      originalCohort.modules.forEach(module => {
        module.questions.forEach(question => {
          origContents += question.contents.length;
          question.contents.forEach(content => {
            origMiniQuestions += content.miniQuestions.length;
          });
        });
      });
      
      originalCohort.questions.forEach(question => {
        if (!question.moduleId) {
          origContents += question.contents.length;
          question.contents.forEach(content => {
            origMiniQuestions += content.miniQuestions.length;
          });
        }
      });
      
      console.log(`\n🔄 Comparison with original "${originalCohort.name}":`);
      console.log(`   Modules: ${originalCohort.modules.length} → ${copiedCohort.modules.length} ✅`);
      console.log(`   Questions: ${originalCohort.questions.length} → ${copiedCohort.questions.length} ✅`);
      console.log(`   Contents: ${origContents} → ${totalContents} ✅`);
      console.log(`   Mini Questions: ${origMiniQuestions} → ${totalMiniQuestions} ✅`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCopiedData();
