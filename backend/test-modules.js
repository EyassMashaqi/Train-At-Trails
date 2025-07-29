const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testModuleOperations() {
  try {
    console.log('Testing Module operations...');

    // Test: Get all modules
    const modules = await prisma.module.findMany({
      include: {
        questions: true
      }
    });
    console.log(`Found ${modules.length} modules`);
    modules.forEach(module => {
      console.log(`- ${module.title} (Module ${module.moduleNumber}) with ${module.questions.length} questions`);
    });

    // Test: Create a new module
    const testModule = await prisma.module.create({
      data: {
        moduleNumber: 99,
        title: 'Test Module',
        description: 'This is a test module',
        isActive: false,
        isReleased: false
      }
    });
    console.log(`Created test module: ${testModule.title}`);

    // Test: Delete the test module
    await prisma.module.delete({
      where: { id: testModule.id }
    });
    console.log('Deleted test module');

    console.log('All tests passed! Module operations are working correctly.');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testModuleOperations();
