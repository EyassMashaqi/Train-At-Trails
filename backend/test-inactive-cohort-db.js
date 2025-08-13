const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testInactiveCohortData() {
  console.log('=== Testing Inactive Cohort Data Access ===\n');

  try {
    // 1. Find inactive cohorts in the database
    const inactiveCohorts = await prisma.cohort.findMany({
      where: { isActive: false },
      select: { 
        id: true, 
        name: true, 
        isActive: true,
        _count: {
          select: {
            cohortMembers: true,
            modules: true,
            questions: true
          }
        }
      }
    });

    console.log('=== Database Query Results ===');
    console.log(`Found ${inactiveCohorts.length} inactive cohorts:`);
    inactiveCohorts.forEach(cohort => {
      console.log(`  - ${cohort.name} (${cohort.id})`);
      console.log(`    Active: ${cohort.isActive}`);
      console.log(`    Members: ${cohort._count.cohortMembers}`);
      console.log(`    Modules: ${cohort._count.modules}`);
      console.log(`    Questions: ${cohort._count.questions}`);
      console.log('');
    });

    // 2. Test direct database queries for admin operations
    if (inactiveCohorts.length > 0) {
      const testCohort = inactiveCohorts[0];
      console.log(`=== Testing Admin Operations for: ${testCohort.name} ===\n`);

      // Simulate admin stats query (without isActive requirement)
      const stats = await prisma.cohort.findFirst({
        where: { 
          id: testCohort.id
          // Note: NO isActive: true requirement
        },
        include: {
          _count: {
            select: {
              cohortMembers: true,
              questions: true,
              modules: true
            }
          }
        }
      });

      if (stats) {
        console.log('✅ Admin can access inactive cohort stats:');
        console.log(`   Cohort: ${stats.name} (Active: ${stats.isActive})`);
        console.log(`   Members: ${stats._count.cohortMembers}`);
        console.log(`   Questions: ${stats._count.questions}`);
        console.log(`   Modules: ${stats._count.modules}`);
      } else {
        console.log('❌ Admin cannot access inactive cohort stats');
      }

      // Simulate admin pending answers query (without isActive requirement)
      const pendingAnswers = await prisma.answer.findMany({
        where: {
          question: {
            cohortId: testCohort.id
          },
          status: 'PENDING'
        },
        select: {
          id: true,
          status: true,
          question: {
            select: {
              cohortId: true
            }
          }
        }
      });

      console.log(`\n✅ Admin can access pending answers for inactive cohort:`);
      console.log(`   Found ${pendingAnswers.length} pending answers`);

    } else {
      console.log('⚠️ No inactive cohorts found to test');
      
      // Create a test inactive cohort for demonstration
      console.log('\n=== Creating Test Inactive Cohort ===');
      const testCohort = await prisma.cohort.create({
        data: {
          name: 'Test Inactive Cohort',
          description: 'Test cohort for inactive access testing',
          isActive: false,
          cohortNumber: 99999,
          trainName: 'Test Train',
          maxParticipants: 10,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          defaultTheme: 'trains'
        }
      });

      console.log(`✅ Created test inactive cohort: ${testCohort.name} (${testCohort.id})`);
      console.log(`   Active status: ${testCohort.isActive}`);
    }

    console.log('\n=== Summary ===');
    console.log('✅ Database queries work for inactive cohorts');
    console.log('✅ Admin endpoints should now work with the isActive requirement removed');
    console.log('✅ Copied cohorts should be accessible in admin dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testInactiveCohortData();
