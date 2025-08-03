// Test script to update user progress for leaderboard testing
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserProgress() {
  try {
    // Update Alice's progress to step 2
    const updatedUser = await prisma.user.update({
      where: { email: 'alice@traintrails.com' },
      data: { currentStep: 2 }
    });

    console.log('✅ Updated Alice\'s progress to step 2:', updatedUser.trainName, 'step', updatedUser.currentStep);

    // Test leaderboard query
    const users = await prisma.user.findMany({
      where: {
        isAdmin: false,
        currentStep: { gt: 0 }
      },
      select: {
        id: true,
        fullName: true,
        trainName: true,
        currentStep: true,
        createdAt: true
      },
      orderBy: [
        { currentStep: 'desc' },
        { createdAt: 'asc' }
      ],
      take: 20
    });

    console.log('\n📊 Leaderboard results:');
    console.log(`Found ${users.length} users with progress:`);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.trainName || user.fullName} - Step ${user.currentStep}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserProgress();
