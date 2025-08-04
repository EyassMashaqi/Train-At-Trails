const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createDefaultCohort() {
  try {
    // Check if Default Cohort already exists
    const existingDefault = await prisma.cohort.findFirst({
      where: { name: 'Default Cohort' }
    });

    if (existingDefault) {
      console.log('✅ Default Cohort already exists:', existingDefault.name);
      return;
    }

    // Create Default Cohort
    const defaultCohort = await prisma.cohort.create({
      data: {
        name: 'Default Cohort',
        description: 'Default cohort for new users and general training',
        startDate: new Date(),
        endDate: null,
        isActive: true
      }
    });

    // Create default game config for the cohort
    await prisma.cohortGameConfig.create({
      data: {
        cohortId: defaultCohort.id,
        questionReleaseIntervalHours: 48,
        totalQuestions: 12,
        gameStartDate: new Date()
      }
    });

    console.log('✅ Default Cohort created successfully:', defaultCohort.name);
    console.log('📋 Cohort ID:', defaultCohort.id);

  } catch (error) {
    console.error('❌ Error creating default cohort:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultCohort();
