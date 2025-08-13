const { PrismaClient } = require('@prisma/client');

async function checkCohortNumbers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking cohort numbers...');
    
    // Get all cohorts with cohortNumber field
    const cohorts = await prisma.cohort.findMany({
      select: {
        id: true,
        cohortNumber: true,
        name: true,
        description: true,
        isActive: true,
        startDate: true,
        endDate: true
      },
      orderBy: { cohortNumber: 'asc' }
    });
    
    console.log(`Found ${cohorts.length} cohorts:`);
    console.log(JSON.stringify(cohorts, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCohortNumbers();
