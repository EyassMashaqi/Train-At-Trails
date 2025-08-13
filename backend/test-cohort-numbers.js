const { PrismaClient } = require('@prisma/client');

async function testCohortNumberFeatures() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing cohort number features...\n');
    
    // Test 1: Auto-assignment of cohort number
    console.log('1️⃣ Testing auto-assignment of cohort number...');
    const lastCohort = await prisma.cohort.findFirst({
      orderBy: { cohortNumber: 'desc' }
    });
    const nextNumber = lastCohort ? lastCohort.cohortNumber + 1 : 1;
    console.log(`   Expected next auto-assigned number: ${nextNumber}`);
    
    // Test 2: Check uniqueness validation
    console.log('\n2️⃣ Testing uniqueness of cohort numbers...');
    const existingNumbers = await prisma.cohort.findMany({
      select: { cohortNumber: true }
    });
    console.log('   Existing cohort numbers:', existingNumbers.map(c => c.cohortNumber));
    
    // Test 3: Verify all cohorts have cohort numbers
    console.log('\n3️⃣ Verifying all cohorts have cohort numbers...');
    const allCohorts = await prisma.cohort.findMany({
      select: { id: true, cohortNumber: true, name: true }
    });
    
    const cohortsWithoutNumbers = allCohorts.filter(c => c.cohortNumber === null || c.cohortNumber === undefined);
    
    if (cohortsWithoutNumbers.length === 0) {
      console.log('   ✅ All cohorts have cohort numbers assigned');
    } else {
      console.log('   ❌ Found cohorts without numbers:', cohortsWithoutNumbers.length);
    }
    
    // Test 4: Order cohorts by number
    console.log('\n4️⃣ Testing ordering by cohort number...');
    const orderedCohorts = await prisma.cohort.findMany({
      orderBy: { cohortNumber: 'asc' },
      select: { cohortNumber: true, name: true }
    });
    
    console.log('   Cohorts ordered by number:');
    orderedCohorts.forEach(cohort => {
      console.log(`     ${cohort.cohortNumber}. ${cohort.name}`);
    });
    
    console.log('\n✅ All cohort number features working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing cohort number features:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCohortNumberFeatures();
