const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        trainName: true,
        isAdmin: true,
        currentStep: true,
        createdAt: true
      }
    });

    console.log(`📊 Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ${user.email} | ${user.fullName} | Admin: ${user.isAdmin} | Step: ${user.currentStep}`);
    });

    if (users.length === 0) {
      console.log('❌ No users found in database!');
    }
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
