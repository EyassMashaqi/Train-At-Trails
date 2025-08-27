const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugResubmission() {
  try {
    console.log('=== Debugging Resubmission Issues ===\n');
    
    // 1. Check all answers with resubmission requested
    console.log('1. Answers with resubmission requested:');
    const resubmissionRequests = await prisma.answer.findMany({
      where: {
        resubmissionRequested: true
      },
      include: {
        user: { select: { fullName: true, email: true } },
        question: { select: { title: true, topicNumber: true } }
      },
      orderBy: { resubmissionRequestedAt: 'desc' }
    });
    
    console.log(`Found ${resubmissionRequests.length} answers with resubmission requested:`);
    resubmissionRequests.forEach(answer => {
      console.log(`- Answer ID: ${answer.id}`);
      console.log(`  User: ${answer.user.fullName} (${answer.user.email})`);
      console.log(`  Question: ${answer.question.title}`);
      console.log(`  Grade: ${answer.grade}`);
      console.log(`  Resubmission Requested: ${answer.resubmissionRequested}`);
      console.log(`  Resubmission Approved: ${answer.resubmissionApproved}`);
      console.log(`  Requested At: ${answer.resubmissionRequestedAt}`);
      console.log(`  Status: ${answer.status}`);
      console.log('---');
    });
    
    // 2. Check answers that should be available for resubmission
    console.log('\n2. Answers that should be available for resubmission:');
    const resubmittableAnswers = await prisma.answer.findMany({
      where: {
        OR: [
          { grade: 'NEEDS_RESUBMISSION' },
          {
            resubmissionRequested: true,
            resubmissionApproved: true
          }
        ]
      },
      include: {
        user: { select: { fullName: true, email: true } },
        question: { select: { title: true, topicNumber: true, isReleased: true, isActive: true } }
      }
    });
    
    console.log(`Found ${resubmittableAnswers.length} answers that should be resubmittable:`);
    resubmittableAnswers.forEach(answer => {
      console.log(`- Answer ID: ${answer.id}`);
      console.log(`  User: ${answer.user.fullName} (${answer.user.email})`);
      console.log(`  Question: ${answer.question.title}`);
      console.log(`  Question Released: ${answer.question.isReleased}`);
      console.log(`  Question Active: ${answer.question.isActive}`);
      console.log(`  Grade: ${answer.grade}`);
      console.log(`  Status: ${answer.status}`);
      console.log(`  Resubmission Requested: ${answer.resubmissionRequested}`);
      console.log(`  Resubmission Approved: ${answer.resubmissionApproved}`);
      console.log('---');
    });
    
    // 3. Check for any user with specific email to see their answers
    const testUserEmail = 'eyass.mashaqi@visiontrust.org'; // Replace with actual user email
    console.log(`\n3. Checking answers for user: ${testUserEmail}`);
    const userAnswers = await prisma.answer.findMany({
      where: {
        user: { email: testUserEmail }
      },
      include: {
        question: { 
          select: { 
            title: true, 
            topicNumber: true, 
            isReleased: true, 
            isActive: true,
            module: {
              select: { title: true, isReleased: true, isActive: true }
            }
          } 
        }
      },
      orderBy: { submittedAt: 'desc' }
    });
    
    console.log(`Found ${userAnswers.length} answers for ${testUserEmail}:`);
    userAnswers.forEach(answer => {
      console.log(`- Answer ID: ${answer.id}`);
      console.log(`  Question: ${answer.question.title}`);
      console.log(`  Module: ${answer.question.module?.title} (Released: ${answer.question.module?.isReleased}, Active: ${answer.question.module?.isActive})`);
      console.log(`  Question Released: ${answer.question.isReleased}, Active: ${answer.question.isActive}`);
      console.log(`  Grade: ${answer.grade}`);
      console.log(`  Status: ${answer.status}`);
      console.log(`  Resubmission Requested: ${answer.resubmissionRequested}`);
      console.log(`  Resubmission Approved: ${answer.resubmissionApproved}`);
      console.log(`  Submitted At: ${answer.submittedAt}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugResubmission();
