const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupModulesAndAssignments() {
  try {
    console.log('🧹 Cleaning up existing modules and assignments...');
    
    // Delete in proper order to avoid foreign key constraints
    console.log('Deleting mini questions...');
    await prisma.miniQuestion.deleteMany({});
    
    console.log('Deleting content sections...');
    await prisma.content.deleteMany({});
    
    console.log('Deleting questions/assignments...');
    await prisma.question.deleteMany({
      where: {
        moduleId: { not: null }
      }
    });
    
    console.log('Deleting modules...');
    await prisma.module.deleteMany({});
    
    console.log('✅ Cleanup completed successfully!');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    await prisma.$disconnect();
  }
}

cleanupModulesAndAssignments();
