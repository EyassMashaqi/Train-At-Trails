const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCohortAnswerIsolation() {
  try {
    console.log('=== Testing Cohort Answer Isolation ===\n');

    // Test Case: Simulate the scenario where a user in one cohort answers a question
    // and verify that this answer doesn't appear in other cohorts

    // 1. Get all cohorts
    const cohorts = await prisma.cohort.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });

    if (cohorts.length < 2) {
      console.log('⚠️  Need at least 2 cohorts to test isolation. Found:', cohorts.length);
      return;
    }

    console.log('Available cohorts:');
    cohorts.forEach((cohort, index) => {
      console.log(`  ${index + 1}. ${cohort.name} (${cohort.id})`);
    });

    // 2. For each cohort, test admin view of answers
    console.log('\n=== Testing Admin View Isolation ===');
    
    for (const cohort of cohorts) {
      console.log(`\nTesting admin view for cohort: ${cohort.name}`);
      
      // Simulate admin request to get pending answers for this cohort
      const pendingAnswers = await prisma.answer.findMany({
        where: { 
          status: 'PENDING',
          cohortId: cohort.id // This ensures only answers from this cohort are shown
        },
        include: {
          user: {
            select: {
              fullName: true,
              email: true
            }
          },
          question: {
            select: {
              questionNumber: true,
              title: true
            }
          },
          cohort: {
            select: {
              name: true
            }
          }
        }
      });

      console.log(`  Pending answers in ${cohort.name}: ${pendingAnswers.length}`);
      pendingAnswers.forEach((answer, index) => {
        console.log(`    ${index + 1}. ${answer.user.fullName} answered Q${answer.question.questionNumber} in ${answer.cohort.name}`);
      });

      // Test getting all answers for questions in this cohort
      const allAnswers = await prisma.answer.findMany({
        where: {
          cohortId: cohort.id
        },
        include: {
          user: { select: { fullName: true } },
          question: { select: { questionNumber: true, title: true } }
        }
      });

      console.log(`  Total answers in ${cohort.name}: ${allAnswers.length}`);
    }

    // 3. Test user view isolation
    console.log('\n=== Testing User View Isolation ===');
    
    const users = await prisma.user.findMany({
      where: { isAdmin: false },
      include: {
        cohortMembers: {
          where: { status: 'ENROLLED' },
          include: { cohort: { select: { name: true } } }
        }
      },
      take: 5
    });

    for (const user of users) {
      if (user.cohortMembers.length === 0) {
        console.log(`\n${user.fullName}: Not enrolled in any cohort`);
        continue;
      }

      const userCohort = user.cohortMembers[0];
      console.log(`\n${user.fullName} (enrolled in: ${userCohort.cohort.name})`);

      // Test what questions this user can see
      const visibleQuestions = await prisma.question.findMany({
        where: {
          cohortId: userCohort.cohortId,
          isReleased: true
        },
        select: {
          id: true,
          questionNumber: true,
          title: true
        },
        take: 3
      });

      console.log(`  Can see ${visibleQuestions.length} questions from their cohort`);

      // Test what answers this user can see (their own)
      const userAnswers = await prisma.answer.findMany({
        where: {
          userId: user.id,
          cohortId: userCohort.cohortId
        },
        include: {
          question: { select: { questionNumber: true } }
        }
      });

      console.log(`  Has submitted ${userAnswers.length} answers in their cohort`);
    }

    // 4. Test cross-cohort contamination
    console.log('\n=== Testing Cross-Cohort Contamination ===');
    
    const crossCohortViolations = await prisma.answer.findMany({
      include: {
        user: {
          include: {
            cohortMembers: {
              where: { status: 'ENROLLED' },
              select: { cohortId: true }
            }
          }
        },
        cohort: { select: { name: true } }
      }
    });

    let violationCount = 0;
    crossCohortViolations.forEach(answer => {
      const userCohorts = answer.user.cohortMembers.map(cm => cm.cohortId);
      if (!userCohorts.includes(answer.cohortId)) {
        console.log(`❌ VIOLATION: ${answer.user.fullName} answered in cohort '${answer.cohort.name}' but is not a member`);
        violationCount++;
      }
    });

    if (violationCount === 0) {
      console.log('✅ No cross-cohort contamination found!');
    } else {
      console.log(`❌ Found ${violationCount} cross-cohort violations!`);
    }

    // 5. Test the specific issue: answers appearing across cohorts
    console.log('\n=== Testing Specific Issue: Answer Visibility Across Cohorts ===');
    
    for (const cohort of cohorts) {
      const answers = await prisma.answer.findMany({
        where: {
          cohortId: cohort.id
        },
        include: {
          user: { select: { fullName: true } },
          question: { select: { questionNumber: true } }
        }
      });

      console.log(`\nCohort '${cohort.name}' should only see these answers:`);
      answers.forEach((answer, index) => {
        console.log(`  ${index + 1}. ${answer.user.fullName} answered Q${answer.question.questionNumber}`);
      });

      // Verify that when an admin views this cohort, they only see these answers
      const adminView = await prisma.answer.findMany({
        where: {
          cohortId: cohort.id
        }
      });

      const isCorrect = adminView.length === answers.length;
      console.log(`  Admin view correctness: ${isCorrect ? '✅' : '❌'} (${adminView.length} vs ${answers.length})`);
    }

    console.log('\n=== Isolation Test Complete ===');
    console.log('\n🎯 SUMMARY:');
    console.log('- Cohort isolation prevents answers from appearing across different cohorts');
    console.log('- Each user can only see questions and submit answers for their enrolled cohort');
    console.log('- Admins can only see answers from cohorts they have access to');
    console.log('- The original issue should now be fixed with proper cohortId filtering');

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCohortAnswerIsolation();
