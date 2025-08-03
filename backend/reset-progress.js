// Reset user progress for empty state testing
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetUserProgress() {
  try {
    // Reset Alice's progress to step 0
    const updatedUser = await prisma.user.update({
      where: { email: 'alice@traintrails.com' },
      data: { currentStep: 0 }
    });

    console.log('✅ Reset Alice\'s progress to step 0:', updatedUser.trainName, 'step', updatedUser.currentStep);

    // Reset all other users to step 0 as well
    await prisma.user.updateMany({
      where: { isAdmin: false },
      data: { currentStep: 0 }
    });

    console.log('✅ Reset all user progress to 0 for empty state testing');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetUserProgress();
