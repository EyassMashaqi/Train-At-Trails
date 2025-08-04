import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToStatusSystem() {
  console.log('🔄 Starting migration to status-based system...');

  try {
    // Get all cohort members
    const cohortMembers = await (prisma as any).cohortMember.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        },
        cohort: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`Found ${cohortMembers.length} cohort memberships to migrate`);

    // Update each membership with proper status
    for (const member of cohortMembers) {
      let newStatus = 'ENROLLED'; // default
      let statusChangedAt = member.joinedAt;
      let statusChangedBy = 'system';

      // Determine status based on existing fields
      if (member.isGraduated) {
        newStatus = 'GRADUATED';
        statusChangedAt = member.graduatedAt || member.joinedAt;
        statusChangedBy = member.graduatedBy || 'system';
      } else if (!member.isActive) {
        newStatus = 'REMOVED';
      }

      await (prisma as any).cohortMember.update({
        where: { id: member.id },
        data: {
          status: newStatus,
          statusChangedAt: statusChangedAt,
          statusChangedBy: statusChangedBy
        }
      });

      console.log(`✅ Updated ${member.user.fullName} in ${member.cohort.name}: ${newStatus}`);
    }

    // Update users' current cohort assignments
    console.log('🔄 Updating user current cohort assignments...');
    
    const users = await prisma.user.findMany({
      where: { isAdmin: false },
      include: {
        cohortMembers: {
          where: {
            status: 'ENROLLED'
          },
          include: {
            cohort: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    for (const user of users) {
      if (user.cohortMembers.length > 0) {
        // Set the first enrolled cohort as current
        const currentCohortId = user.cohortMembers[0].cohortId;
        
        await (prisma as any).user.update({
          where: { id: user.id },
          data: { currentCohortId }
        });

        console.log(`✅ Set current cohort for ${user.fullName}: ${user.cohortMembers[0].cohort.name}`);
      }
    }

    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateToStatusSystem();
