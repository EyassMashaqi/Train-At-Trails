const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugMiniAnswersCohort() {
  try {
    console.log('🔍 DEBUGGING MINI-ANSWERS COHORT ISSUE\n');

    // Get test user data
    const testUser = await prisma.user.findFirst({
      where: { email: 'test@traintrails.com' },
      select: {
        id: true,
        email: true,
        fullName: true,
        currentCohortId: true
      }
    });

    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }

    console.log('👤 TEST USER DATA:');
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Current Cohort ID: ${testUser.currentCohortId || 'None'}\n`);

    // Get user's cohort memberships
    const memberships = await prisma.cohortMember.findMany({
      where: { userId: testUser.id },
      include: {
        cohort: {
          select: { id: true, name: true, isActive: true }
        }
      }
    });

    console.log('🏢 USER COHORT MEMBERSHIPS:');
    memberships.forEach(membership => {
      console.log(`   ${membership.cohort.name} (${membership.cohort.id})`);
      console.log(`   Status: ${membership.status}, Active: ${membership.cohort.isActive}`);
    });
    console.log();

    // Get all mini-answers for this user
    const miniAnswers = await prisma.miniAnswer.findMany({
      where: { userId: testUser.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            currentCohortId: true
          }
        },
        miniQuestion: {
          select: {
            id: true,
            title: true,
            content: {
              select: {
                id: true,
                title: true,
                question: {
                  select: {
                    id: true,
                    questionNumber: true,
                    title: true,
                    cohortId: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    console.log(`📝 MINI-ANSWERS FOR USER (${miniAnswers.length} total):`);
    miniAnswers.forEach((answer, index) => {
      console.log(`   ${index + 1}. ${answer.miniQuestion.title}`);
      console.log(`      Question Cohort: ${answer.miniQuestion.content.question.cohortId}`);
      console.log(`      User Current Cohort: ${answer.user.currentCohortId || 'None'}`);
      console.log(`      Status: ${answer.status}`);
      console.log(`      Link: ${answer.link}`);
      console.log();
    });

    // Test the current filtering logic
    console.log('🔍 TESTING CURRENT FILTERING LOGIC:');
    
    // Test with test1111 cohort
    const test1111CohortId = 'cmdx1vv1s000012q6d3rlg1q';
    
    console.log(`\n📊 Query with cohort filter: ${test1111CohortId}`);
    const filteredAnswers = await prisma.miniAnswer.findMany({
      where: {
        user: {
          currentCohortId: { in: [test1111CohortId] }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            currentCohortId: true
          }
        }
      }
    });
    
    console.log(`   Results: ${filteredAnswers.length} answers found`);
    
    // Test alternative filtering approach - by cohort membership
    console.log(`\n📊 Alternative Query - by cohort membership:`);
    const membershipFilteredAnswers = await prisma.miniAnswer.findMany({
      where: {
        user: {
          cohortMemberships: {
            some: {
              cohortId: test1111CohortId,
              status: 'ENROLLED'
            }
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            currentCohortId: true
          }
        }
      }
    });
    
    console.log(`   Results: ${membershipFilteredAnswers.length} answers found`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMiniAnswersCohort();
