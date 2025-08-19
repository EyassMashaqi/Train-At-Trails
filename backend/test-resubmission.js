const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testResubmissionFunctionality() {
  try {
    console.log('🧪 Testing Request Resubmission Functionality');
    console.log('='.repeat(50));

    // 1. Check if MiniAnswer model has resubmission fields
    console.log('\n1. Checking MiniAnswer schema...');
    
    const sampleMiniAnswer = await prisma.miniAnswer.findFirst({
      select: {
        id: true,
        resubmissionRequested: true,
        resubmissionRequestedAt: true,
        resubmissionRequestedBy: true,
        linkUrl: true,
        notes: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        miniQuestion: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (sampleMiniAnswer) {
      console.log('✅ MiniAnswer schema includes resubmission fields');
      console.log('📋 Sample mini answer:', {
        id: sampleMiniAnswer.id,
        user: sampleMiniAnswer.user.fullName,
        question: sampleMiniAnswer.miniQuestion.title,
        resubmissionRequested: sampleMiniAnswer.resubmissionRequested,
        linkUrl: sampleMiniAnswer.linkUrl.substring(0, 50) + '...'
      });
    } else {
      console.log('⚠️  No mini answers found in database');
      return;
    }
    
    const testAnswer = miniAnswers[0];
    console.log(`📝 Testing with answer from ${testAnswer.user.fullName} for "${testAnswer.miniQuestion.title}"`);
    
    // Test updating the resubmission fields
    const updated = await prisma.miniAnswer.update({
      where: { id: testAnswer.id },
      data: {
        resubmissionRequested: true,
        resubmissionRequestedAt: new Date(),
        resubmissionRequestedBy: 'test-admin-id'
      }
    });
    
    console.log('✅ Successfully updated resubmission fields!');
    console.log(`   - resubmissionRequested: ${updated.resubmissionRequested}`);
    console.log(`   - resubmissionRequestedAt: ${updated.resubmissionRequestedAt}`);
    console.log(`   - resubmissionRequestedBy: ${updated.resubmissionRequestedBy}`);
    
    // Reset the test data
    await prisma.miniAnswer.update({
      where: { id: testAnswer.id },
      data: {
        resubmissionRequested: false,
        resubmissionRequestedAt: null,
        resubmissionRequestedBy: null
      }
    });
    
    console.log('✅ Test completed successfully - fields are working!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testResubmissionFields();
