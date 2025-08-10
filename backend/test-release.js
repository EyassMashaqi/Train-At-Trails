const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testReleaseQuestion() {
  try {
    console.log('🔍 Testing by releasing the first question...\n');
    
    // Find the first question 
    const firstQuestion = await prisma.question.findFirst({
      where: { title: 'Modern JavaScript ES6+' },
      include: {
        contents: {
          include: {
            miniQuestions: true
          }
        }
      }
    });
    
    if (!firstQuestion) {
      console.log('❌ Question not found');
      return;
    }
    
    console.log(`📋 Found question: ${firstQuestion.title}`);
    console.log(`   - Currently released: ${firstQuestion.isReleased}`);
    console.log(`   - Mini-questions: ${firstQuestion.contents.flatMap(c => c.miniQuestions).length}`);
    
    // Release the question
    await prisma.question.update({
      where: { id: firstQuestion.id },
      data: { 
        isReleased: true,
        releasedAt: new Date()
      }
    });
    
    console.log(`✅ Released question: ${firstQuestion.title}`);
    console.log('🎯 Now test the game page - this question should be visible');
    console.log('🔒 Then unrelease it using the admin interface to test the cascade unreleasing');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testReleaseQuestion();
