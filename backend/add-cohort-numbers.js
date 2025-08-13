const { PrismaClient } = require('@prisma/client');

async function addCohortNumbers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Adding cohort numbers to existing cohorts...');
    
    // Get all existing cohorts ordered by creation date
    const cohorts = await prisma.cohort.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`Found ${cohorts.length} existing cohorts`);
    
    // Add cohort numbers starting from 1
    for (let i = 0; i < cohorts.length; i++) {
      const cohort = cohorts[i];
      const cohortNumber = i + 1;
      
      console.log(`Assigning cohort number ${cohortNumber} to: ${cohort.name} (ID: ${cohort.id})`);
      
      // Update each cohort with its number
      await prisma.cohort.update({
        where: { id: cohort.id },
        data: { cohortNumber: cohortNumber }
      });
      
      console.log(`✅ Updated cohort ${cohort.name} with number ${cohortNumber}`);
    }
    
    console.log('✅ All cohort numbers assigned successfully!');
    
    // Verify the updates
    const updatedCohorts = await prisma.cohort.findMany({
      orderBy: { cohortNumber: 'asc' }
    });
    
    console.log('\n📋 Final Cohort List:');
    updatedCohorts.forEach(cohort => {
      console.log(`  ${cohort.cohortNumber}. ${cohort.name} (${cohort.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addCohortNumbers();
