const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApiLogic() {
  try {
    console.log('=== Testing API Logic ===');
    
    // Get test user's cohort info (admin has no cohort)
    const user = await prisma.user.findFirst({
      where: { email: 'test@traintrails.com' },
      include: {
        cohortMembers: {
          where: { status: 'ENROLLED' },
          include: {
            cohort: true
          }
        }
      }
    });

    if (!user || user.cohortMembers.length === 0) {
      console.log('No user with cohort found');
      return;
    }

    const membership = user.cohortMembers[0];
    console.log('User:', user.email);
    console.log('Cohort:', membership.cohort.name);

    // Check modules with the new logic - exact same query as the API
    const modules = await prisma.module.findMany({
      where: {
        cohortId: membership.cohortId
      },
      include: {
        questions: {
          include: {
            module: true // Include module info for the new logic
          },
          orderBy: { topicNumber: 'asc' }
        }
      },
      orderBy: { moduleNumber: 'asc' }
    });

    console.log('\nTesting new accessibility logic:');
    modules.forEach(module => {
      console.log(`\nModule: ${module.title} (Released: ${module.isReleased}, Active: ${module.isActive})`);
      
      module.questions.forEach(question => {
        // Apply the NEW logic
        const isQuestionAccessible = question.isReleased && question.isActive && 
                                    module.isReleased && module.isActive;
        
        console.log(`  Q${question.topicNumber}: ${question.title}`);
        console.log(`    - Question: Released=${question.isReleased}, Active=${question.isActive}`);
        console.log(`    - Module: Released=${module.isReleased}, Active=${module.isActive}`);
        console.log(`    - ACCESSIBLE: ${isQuestionAccessible}`);
      });
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

testApiLogic();
