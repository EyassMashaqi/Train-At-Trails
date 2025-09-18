const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testManualRelease() {
  try {
    console.log('🧪 Testing manual release functionality...\n');
    
    // Find a question that is not released
    const unreleasedQuestion = await prisma.question.findFirst({
      where: {
        isReleased: false
      }
    });
    
    if (unreleasedQuestion) {
      console.log(`📝 Found unreleased question: "${unreleasedQuestion.title}"`);
      console.log(`   Question Number: ${unreleasedQuestion.questionNumber}`);
      console.log(`   Cohort ID: ${unreleasedQuestion.cohortId}`);
      console.log(`   Currently Released: ${unreleasedQuestion.isReleased}\n`);
      
      console.log('ℹ️ To test manual question release:');
      console.log(`   1. Go to admin dashboard`);
      console.log(`   2. Find question: "${unreleasedQuestion.title}"`);
      console.log(`   3. Check the "Released" checkbox`);
      console.log(`   4. Save the question`);
      console.log(`   5. Check for email notifications in logs\n`);
    } else {
      console.log('⚠️ No unreleased questions found with cohorts\n');
    }
    
    // Find a mini-question that is not released
    const unreleasedMiniQuestion = await prisma.miniQuestion.findFirst({
      where: {
        isReleased: false
      },
      include: {
        content: {
          include: {
            question: true
          }
        }
      }
    });
    
    if (unreleasedMiniQuestion) {
      console.log(`📝 Found unreleased mini-question: "${unreleasedMiniQuestion.title}"`);
      console.log(`   Content: ${unreleasedMiniQuestion.content.title}`);
      console.log(`   Parent Question: ${unreleasedMiniQuestion.content.question.title}`);
      console.log(`   Cohort ID: ${unreleasedMiniQuestion.content.question.cohortId}`);
      console.log(`   Currently Released: ${unreleasedMiniQuestion.isReleased}\n`);
      
      console.log('ℹ️ To test manual mini-question release:');
      console.log(`   1. Go to admin dashboard`);
      console.log(`   2. Find mini-question: "${unreleasedMiniQuestion.title}"`);
      console.log(`   3. Check the "Released" checkbox`);
      console.log(`   4. Save the mini-question`);
      console.log(`   5. Check for email notifications in logs\n`);
    } else {
      console.log('⚠️ No unreleased mini-questions found with cohorts\n');
    }
    
    // Show current cohort members for reference
    const cohortMembers = await prisma.cohortMember.findMany({
      where: {
        status: 'ENROLLED'
      },
      include: {
        user: {
          select: {
            email: true,
            fullName: true
          }
        },
        cohort: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`👥 Current enrolled cohort members (${cohortMembers.length}):`);
    cohortMembers.forEach(member => {
      console.log(`   - ${member.user.fullName} (${member.user.email}) in "${member.cohort.name}"`);
    });
    
  } catch (error) {
    console.error('❌ Error testing manual release:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testManualRelease();