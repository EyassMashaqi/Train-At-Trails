const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCohorts() {
  try {
    const cohorts = await prisma.cohort.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        startDate: true,
        endDate: true
      }
    });
    
    console.log('Current Cohorts:');
    console.log(JSON.stringify(cohorts, null, 2));
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkCohorts();
