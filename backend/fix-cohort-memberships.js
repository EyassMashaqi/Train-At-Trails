const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCohortMemberships() {
  try {
    console.log('🔧 Fixing cohort memberships...');

    // Get default cohort
    const defaultCohort = await prisma.cohort.findFirst({
      where: { name: 'Default Cohort' }
    });

    if (!defaultCohort) {
      console.error('❌ Default cohort not found!');
      return;
    }

    console.log('✅ Default cohort found:', defaultCohort.name);

    // Get all users without cohort memberships
    const usersWithoutMembership = await prisma.user.findMany({
      where: {
        cohortMembers: {
          none: {}
        }
      }
    });

    console.log(`Found ${usersWithoutMembership.length} users without cohort membership`);

    // Create cohort memberships for users who don't have any
    for (const user of usersWithoutMembership) {
      try {
        await prisma.cohortMember.create({
          data: {
            userId: user.id,
            cohortId: defaultCohort.id,
            status: 'ENROLLED',
            isActive: true
          }
        });

        // Update user's current cohort
        await prisma.user.update({
          where: { id: user.id },
          data: { currentCohortId: defaultCohort.id }
        });

        console.log(`✅ Enrolled ${user.email} in Default Cohort`);
      } catch (error) {
        console.error(`❌ Failed to enroll ${user.email}:`, error.message);
      }
    }

    // Also check and fix any users who have memberships but no currentCohortId
    const usersWithoutCurrentCohort = await prisma.user.findMany({
      where: {
        currentCohortId: null,
        cohortMembers: {
          some: {
            status: 'ENROLLED'
          }
        }
      },
      include: {
        cohortMembers: {
          where: {
            status: 'ENROLLED'
          },
          take: 1
        }
      }
    });

    for (const user of usersWithoutCurrentCohort) {
      if (user.cohortMembers.length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { currentCohortId: user.cohortMembers[0].cohortId }
        });
        console.log(`✅ Set current cohort for ${user.email}`);
      }
    }

    console.log('🎉 Cohort membership fix completed!');

  } catch (error) {
    console.error('❌ Error fixing cohort memberships:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCohortMemberships();
