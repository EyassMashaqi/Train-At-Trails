const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupTestMiniQuestion() {
  try {
    // Find a mini question to test with
    const testMiniQuestion = await prisma.miniQuestion.findFirst({
      where: { 
        isReleased: true,
        content: {
          question: {
            isReleased: true,
            cohort: {
              cohortMembers: {
                some: {} // Has at least one member
              }
            }
          }
        }
      },
      include: {
        content: {
          include: {
            question: {
              include: {
                cohort: {
                  include: {
                    cohortMembers: {
                      include: {
                        user: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!testMiniQuestion) {
      console.log('❌ No suitable mini question found for testing');
      return;
    }
    
    console.log('🎯 Found test mini question:', testMiniQuestion.title);
    console.log('📚 Assignment:', testMiniQuestion.content.question.title);
    console.log('👥 Cohort has', testMiniQuestion.content.question.cohort?.cohortMembers.length || 0, 'members');
    
    if (testMiniQuestion.content.question.cohort?.cohortMembers) {
      console.log('📧 Members:');
      testMiniQuestion.content.question.cohort.cohortMembers.forEach(member => {
        console.log(`   - ${member.user.email} (${member.user.fullName})`);
      });
    }
    
    // Mark it as unreleased for testing
    await prisma.miniQuestion.update({
      where: { id: testMiniQuestion.id },
      data: { 
        isReleased: false,
        actualReleaseDate: null
      }
    });
    
    console.log('\n✅ Mini question marked as unreleased');
    console.log('🔧 Mini Question ID:', testMiniQuestion.id);
    console.log('\n🚀 Now you can trigger the release and watch the backend logs:');
    console.log(`curl -X PUT "http://localhost:3000/api/admin/mini-questions/${testMiniQuestion.id}" \\`);
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log('  -d \'{"isReleased": true}\'');
    
    return testMiniQuestion.id;
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestMiniQuestion();