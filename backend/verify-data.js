const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyData() {
  try {
    console.log('Verifying database state...');

    // Check modules
    const modules = await prisma.module.findMany({
      include: {
        questions: true
      }
    });
    console.log(`\n📦 Modules: ${modules.length}`);
    modules.forEach(module => {
      console.log(`  - ${module.title} (${module.questions.length} questions)`);
    });

    // Check users
    const users = await prisma.user.findMany({
      select: {
        email: true,
        fullName: true,
        trainName: true,
        isAdmin: true,
        currentStep: true
      }
    });
    console.log(`\n👥 Users: ${users.length}`);
    users.forEach(user => {
      const role = user.isAdmin ? 'ADMIN' : 'USER';
      console.log(`  - ${user.email} (${role}) - Step ${user.currentStep}`);
    });

    console.log('\n✅ Database verification complete!');

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();
