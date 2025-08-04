import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCohortSystem() {
  console.log('🌱 Seeding cohort system...');

  try {
    // Create default cohort
    const defaultCohort = await prisma.cohort.upsert({
      where: { name: 'Default Cohort' },
      update: {},
      create: {
        name: 'Default Cohort',
        description: 'Default cohort for existing data and new users',
        startDate: new Date('2025-01-01'),
        isActive: true
      }
    });

    console.log(`✅ Created/Updated default cohort: ${defaultCohort.name}`);

    // Create default cohort game config
    await prisma.cohortGameConfig.upsert({
      where: { cohortId: defaultCohort.id },
      update: {},
      create: {
        cohortId: defaultCohort.id,
        questionReleaseIntervalHours: 48,
        totalQuestions: 12,
        gameStartDate: new Date('2025-01-01')
      }
    });

    console.log('✅ Created/Updated default cohort game config');

    // Get all users and add them to the default cohort if not already added
    const users = await prisma.user.findMany();
    
    for (const user of users) {
      const existingMembership = await prisma.cohortMember.findUnique({
        where: {
          userId_cohortId: {
            userId: user.id,
            cohortId: defaultCohort.id
          }
        }
      });

      if (!existingMembership) {
        await prisma.cohortMember.create({
          data: {
            userId: user.id,
            cohortId: defaultCohort.id,
            currentStep: user.currentStep,
            joinedAt: user.createdAt,
            isActive: true
          }
        });
        console.log(`✅ Added user ${user.fullName} to default cohort`);
      }
    }

    // Since this is a fresh database, we don't need to update existing data
    // The migration already handles setting cohortId for any existing data

    console.log('🎉 Cohort system seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding cohort system:', error);
    throw error;
  }
}

// Run the seed function
seedCohortSystem()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
