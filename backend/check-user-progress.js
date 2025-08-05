const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserProgress() {
  try {
    console.log('🔍 Checking user progress...\n');
    
    // Find the user (Alice)
    const user = await prisma.user.findFirst({
      where: { email: 'alice@traintrails.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`👤 User: ${user.fullName} (${user.email})`);
    console.log(`🚂 Train: ${user.trainName}`);
    console.log(`📍 Current Step: ${user.currentStep}`);
    
    // Check cohort membership
    const cohortMember = await prisma.cohortMember.findFirst({
      where: { 
        userId: user.id,
        status: 'ENROLLED'
      },
      include: {
        cohort: true
      }
    });
    
    if (cohortMember) {
      console.log(`🎓 Cohort: ${cohortMember.cohort.name}`);
      console.log(`📊 Cohort Progress: ${cohortMember.currentStep}`);
    }
    
    // Check questions and their availability based on user progress
    const questions = await prisma.question.findMany({
      where: {
        moduleId: { not: null }
      },
      include: {
        module: {
          select: { title: true, isReleased: true }
        }
      },
      orderBy: { topicNumber: 'asc' }
    });
    
    console.log('\n📝 Questions and their availability:');
    questions.forEach((q, i) => {
      // Question should be available if questionNumber <= currentStep + 1
      const shouldBeAvailable = q.questionNumber <= (cohortMember?.currentStep || user.currentStep) + 1;
      console.log(`  ${i+1}. Topic ${q.topicNumber}: "${q.title}"`);
      console.log(`     - Question Number: ${q.questionNumber}`);
      console.log(`     - Released: ${q.isReleased}`);
      console.log(`     - Should be available: ${shouldBeAvailable} (user step: ${cohortMember?.currentStep || user.currentStep})`);
      console.log(`     - Module: "${q.module?.title}" (Released: ${q.module?.isReleased})`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserProgress();
