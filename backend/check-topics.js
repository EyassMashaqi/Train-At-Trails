const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTopics() {
  try {
    console.log('🔍 Checking database...');
    
    // Count all questions
    const allQuestions = await prisma.question.count();
    console.log(`📝 Total questions in database: ${allQuestions}`);
    
    // Count topics (questions with moduleId and topicNumber)
    const topics = await prisma.question.count({
      where: {
        moduleId: { not: null },
        topicNumber: { not: null }
      }
    });
    console.log(`📋 Total topics (assignments): ${topics}`);
    
    // Count released topics
    const releasedTopics = await prisma.question.count({
      where: {
        isReleased: true,
        moduleId: { not: null },
        topicNumber: { not: null },
        module: {
          isReleased: true
        }
      }
    });
    console.log(`✅ Released topics (assignments): ${releasedTopics}`);
    
    // Count released modules
    const releasedModules = await prisma.module.count({
      where: {
        isReleased: true
      }
    });
    console.log(`📚 Released modules: ${releasedModules}`);
    
    // List some sample topics if any exist
    if (topics > 0) {
      console.log('\n📋 Sample topics:');
      const sampleTopics = await prisma.question.findMany({
        where: {
          moduleId: { not: null },
          topicNumber: { not: null }
        },
        include: {
          module: {
            select: { title: true, moduleNumber: true, isReleased: true }
          }
        },
        take: 5
      });
      
      sampleTopics.forEach(topic => {
        console.log(`  - Module ${topic.module.moduleNumber}: ${topic.module.title} - Assignment ${topic.topicNumber}: ${topic.title} (Released: ${topic.isReleased})`);
      });
    } else {
      console.log('\n⚠️  No topics found! This might be why totalSteps is showing 0.');
      console.log('💡 You may need to create some modules and assignments in the admin dashboard.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTopics();
