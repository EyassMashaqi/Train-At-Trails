const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAdminCohortFiltering() {
  try {
    console.log('=== Testing Admin Cohort Filtering ===\n');

    // Get all cohorts
    const cohorts = await prisma.cohort.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });

    console.log('Available cohorts:');
    cohorts.forEach((cohort, index) => {
      console.log(`  ${index + 1}. ${cohort.name} (${cohort.id})`);
    });

    // Test each cohort's pending answers separately
    for (const cohort of cohorts) {
      console.log(`\n=== Testing cohort: ${cohort.name} ===`);
      
      // Simulate the admin API call with cohort filtering
      const pendingAnswers = await prisma.answer.findMany({
        where: { 
          status: 'PENDING',
          cohortId: cohort.id // Filter by specific cohort only
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

      console.log(`Pending answers in ${cohort.name}: ${pendingAnswers.length}`);
      pendingAnswers.forEach((answer, index) => {
        console.log(`  ${index + 1}. ${answer.user.fullName} answered Q${answer.question.questionNumber} in ${answer.cohort.name}`);
      });

      // Check total answers for this cohort
      const totalAnswers = await prisma.answer.count({
        where: {
          cohortId: cohort.id
        }
      });

      console.log(`Total answers in ${cohort.name}: ${totalAnswers}`);

      // Check cohort users
      const cohortUsers = await prisma.cohortMember.count({
        where: {
          cohortId: cohort.id,
          status: 'ENROLLED',
          user: {
            isAdmin: false
          }
        }
      });

      console.log(`Users in ${cohort.name}: ${cohortUsers}`);
    }

    // Test the issue: Check if any answer appears in multiple cohorts
    console.log('\n=== Cross-Cohort Contamination Check ===');
    
    const allAnswers = await prisma.answer.findMany({
      include: {
        user: { select: { fullName: true } },
        question: { select: { questionNumber: true, title: true } },
        cohort: { select: { name: true } }
      }
    });

    // Group answers by user+question combination
    const answerGroups = new Map();
    allAnswers.forEach(answer => {
      const key = `${answer.user.fullName}-Q${answer.question.questionNumber}`;
      if (!answerGroups.has(key)) {
        answerGroups.set(key, []);
      }
      answerGroups.get(key).push(answer);
    });

    let duplicateIssues = 0;
    answerGroups.forEach((answers, key) => {
      if (answers.length > 1) {
        console.log(`\n⚠️  POTENTIAL ISSUE: ${key}`);
        answers.forEach((answer, index) => {
          console.log(`   ${index + 1}. Answer ID: ${answer.id} in cohort: ${answer.cohort.name} (Status: ${answer.status})`);
        });
        duplicateIssues++;
      }
    });

    if (duplicateIssues === 0) {
      console.log('✅ No duplicate answers across cohorts found');
    } else {
      console.log(`❌ Found ${duplicateIssues} potential duplicate issues`);
    }

    console.log('\n=== Admin API Simulation ===');
    
    // Simulate what the admin dashboard should see for each cohort
    for (const cohort of cohorts) {
      console.log(`\nAdmin viewing cohort: ${cohort.name}`);
      console.log(`API call: GET /api/admin/pending-answers?cohortId=${cohort.id}`);
      
      const cohortSpecificAnswers = await prisma.answer.findMany({
        where: { 
          status: 'PENDING',
          cohortId: cohort.id
        },
        include: {
          user: { select: { fullName: true } },
          question: { select: { questionNumber: true, title: true } }
        }
      });

      console.log(`Should show ${cohortSpecificAnswers.length} pending answers:`);
      cohortSpecificAnswers.forEach((answer, index) => {
        console.log(`  ${index + 1}. ${answer.user.fullName} - Q${answer.question.questionNumber}: ${answer.question.title}`);
      });
    }

    console.log('\n✅ Admin cohort filtering test complete');

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminCohortFiltering();
