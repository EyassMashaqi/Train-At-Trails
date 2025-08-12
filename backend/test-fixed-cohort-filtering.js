const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFixedCohortFiltering() {
  try {
    console.log('🔍 TESTING FIXED COHORT FILTERING FOR MINI-ANSWERS\n');

    const test1111CohortId = 'cmdx1vv1s000012q6cd3rlg1q';
    
    // Test the new filtering logic with OR condition
    console.log(`📊 Testing new OR filtering logic with cohort: ${test1111CohortId}`);
    
    const miniAnswers = await prisma.miniAnswer.findMany({
      where: {
        OR: [
          // Filter by users who have active membership in the requested cohorts
          {
            user: {
              cohortMembers: {
                some: {
                  cohortId: { in: [test1111CohortId] },
                  status: 'ENROLLED'
                }
              }
            }
          },
          // Also include users whose current cohort matches (for backward compatibility)
          {
            user: {
              currentCohortId: { in: [test1111CohortId] }
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            trainName: true,
            email: true,
            currentCohortId: true
          }
        },
        miniQuestion: {
          select: {
            id: true,
            title: true,
            question: true,
            description: true,
            content: {
              select: {
                id: true,
                title: true,
                question: {
                  select: {
                    id: true,
                    questionNumber: true,
                    title: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    console.log(`✅ Results: ${miniAnswers.length} mini-answers found\n`);
    
    miniAnswers.forEach((answer, index) => {
      console.log(`${index + 1}. ${answer.user.fullName} (${answer.user.email})`);
      console.log(`   Mini-Question: ${answer.miniQuestion.title}`);
      console.log(`   Question: ${answer.miniQuestion.content.title}`);
      console.log(`   Status: ${answer.status || 'No status'}`);
      console.log(`   Link: ${answer.link || 'No link'}`);
      console.log(`   Notes: ${answer.notes || 'No notes'}`);
      console.log(`   User Current Cohort: ${answer.user.currentCohortId || 'None'}`);
      console.log();
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFixedCohortFiltering();
