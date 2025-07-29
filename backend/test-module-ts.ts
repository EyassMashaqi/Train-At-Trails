import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testModuleModel() {
  try {
    // Check what models are available
    console.log('Available prisma properties:', Object.getOwnPropertyNames(prisma));
    
    // Try dynamic access
    const modulePrisma = (prisma as any).module;
    if (modulePrisma) {
      const modules = await modulePrisma.findMany();
      console.log('Found modules:', modules.length);
    } else {
      console.log('Module model not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testModuleModel();
