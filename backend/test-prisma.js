const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPrismaClient() {
  try {
    console.log('Testing Prisma client...');
    
    // Test if Module model is available
    console.log('Available models:', Object.keys(prisma));
    
    // Try to query modules
    if (prisma.module) {
      const modules = await prisma.module.findMany();
      console.log(`Found ${modules.length} modules`);
    } else {
      console.log('Module model not found in Prisma client');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaClient();
