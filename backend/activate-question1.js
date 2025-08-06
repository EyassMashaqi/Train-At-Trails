const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateQuestion1() {
  try {
    // Find default cohort
    const cohort = await prisma.cohort.findFirst({ 
      where: { name: 'Default Cohort' } 
    });
    
    if (!cohort) {
      console.log('❌ Default cohort not found');
      return;
    }
    
    console.log('🎯 Found cohort:', cohort.name);
    
    // Find question 1
    const question = await prisma.question.findFirst({
      where: { 
        questionNumber: 1,
        cohortId: cohort.id
      }
    });
    
    if (!question) {
      console.log('❌ Question 1 not found');
      return;
    }
    
    console.log('📋 Found question:', question.title);
    console.log('📊 Current status:', {
      isActive: question.isActive,
      isReleased: question.isReleased
    });
    
    // Activate and release question 1
    const updated = await prisma.question.update({
      where: { id: question.id },
      data: { 
        isActive: true,
        isReleased: true,
        releaseDate: new Date()
      }
    });
    
    console.log('✅ Question 1 activated and released!');
    console.log('📊 New status:', {
      isActive: updated.isActive,
      isReleased: updated.isReleased,
      releaseDate: updated.releaseDate
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateQuestion1();
