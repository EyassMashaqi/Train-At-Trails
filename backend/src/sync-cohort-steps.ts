import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncCohortSteps() {
  try {
    console.log('🔄 Starting sync of cohort member steps...');

    // Get all active cohort members with their user's current step
    const cohortMembers = await (prisma as any).cohortMember.findMany({
      where: {
        status: 'ENROLLED',
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            currentStep: true
          }
        },
        cohort: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`📊 Found ${cohortMembers.length} active cohort members`);

    let syncCount = 0;
    for (const member of cohortMembers) {
      const userCurrentStep = member.user.currentStep;
      const cohortCurrentStep = member.currentStep;

      if (userCurrentStep !== cohortCurrentStep) {
        console.log(`🔧 Syncing user ${member.user.email}: cohort step ${cohortCurrentStep} -> user step ${userCurrentStep}`);
        
        await (prisma as any).cohortMember.update({
          where: { id: member.id },
          data: {
            currentStep: userCurrentStep
          }
        });
        
        syncCount++;
      }
    }

    console.log(`✅ Sync completed! Updated ${syncCount} cohort member records`);
    
    // Show summary
    const updatedMembers = await (prisma as any).cohortMember.findMany({
      where: {
        status: 'ENROLLED',
        isActive: true
      },
      include: {
        user: {
          select: {
            email: true,
            currentStep: true
          }
        },
        cohort: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('\n📋 Current status:');
    updatedMembers.forEach((member: any) => {
      console.log(`  ${member.user.email} - ${member.cohort.name}: User Step ${member.user.currentStep}, Cohort Step ${member.currentStep}`);
    });

  } catch (error) {
    console.error('❌ Error syncing cohort steps:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncCohortSteps();
