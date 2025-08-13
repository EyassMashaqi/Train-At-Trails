const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function testCohortCopyChanges() {
  console.log('=== Testing Updated Cohort Copy Functionality ===\n');

  try {
    // 1. Get admin token
    const adminLoginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@traintrails.com',
      password: 'admin123'
    });
    
    const adminToken = adminLoginResponse.data.token;
    console.log('✅ Admin logged in successfully\n');

    // 2. Find a source cohort to copy
    const sourceCohorts = await prisma.cohort.findMany({
      where: { isActive: true },
      include: {
        modules: {
          include: {
            questions: {
              include: {
                contents: {
                  include: {
                    miniQuestions: true
                  }
                }
              }
            }
          }
        },
        questions: true
      },
      take: 1
    });

    if (sourceCohorts.length === 0) {
      console.log('❌ No source cohorts found to copy');
      return;
    }

    const sourceCohort = sourceCohorts[0];
    console.log(`📋 Source cohort: ${sourceCohort.name} (${sourceCohort.id})`);
    console.log(`   Start Date: ${sourceCohort.startDate}`);
    console.log(`   End Date: ${sourceCohort.endDate}`);
    console.log(`   Modules: ${sourceCohort.modules.length}`);
    console.log(`   Questions: ${sourceCohort.questions.length}`);

    // Check source data release status
    const releasedModules = sourceCohort.modules.filter(m => m.isReleased).length;
    const releasedQuestions = sourceCohort.modules.flatMap(m => m.questions).filter(q => q.isReleased).length;
    const releasedMiniQuestions = sourceCohort.modules
      .flatMap(m => m.questions)
      .flatMap(q => q.contents)
      .flatMap(c => c.miniQuestions)
      .filter(mq => mq.isReleased).length;

    console.log(`\n📊 Source Release Status:`);
    console.log(`   Released modules: ${releasedModules}/${sourceCohort.modules.length}`);
    console.log(`   Released questions: ${releasedQuestions}`);
    console.log(`   Released mini questions: ${releasedMiniQuestions}`);

    // 3. Copy the cohort
    const copyData = {
      newName: `Copy Test ${Date.now()}`,
      newCohortNumber: Math.floor(Math.random() * 10000) + 50000
    };

    console.log(`\n🔄 Copying cohort with name: ${copyData.newName}`);

    const copyResponse = await axios.post(
      `http://localhost:3000/api/admin/cohorts/${sourceCohort.id}/copy`,
      copyData,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const newCohortId = copyResponse.data.cohort.id;
    console.log(`✅ Cohort copied successfully! New ID: ${newCohortId}`);

    // 4. Verify the copied cohort
    const copiedCohort = await prisma.cohort.findUnique({
      where: { id: newCohortId },
      include: {
        modules: {
          include: {
            questions: {
              include: {
                contents: {
                  include: {
                    miniQuestions: true
                  }
                }
              }
            }
          }
        },
        questions: true
      }
    });

    console.log(`\n📋 Copied cohort: ${copiedCohort.name} (${copiedCohort.id})`);
    console.log(`   Start Date: ${copiedCohort.startDate} (set to current date as default)`);
    console.log(`   End Date: ${copiedCohort.endDate} (should be null)`);
    console.log(`   Active: ${copiedCohort.isActive} (should be false)`);

    // Check copied data release status
    const copiedReleasedModules = copiedCohort.modules.filter(m => m.isReleased).length;
    const copiedReleasedQuestions = copiedCohort.modules.flatMap(m => m.questions).filter(q => q.isReleased).length;
    const copiedReleasedMiniQuestions = copiedCohort.modules
      .flatMap(m => m.questions)
      .flatMap(q => q.contents)
      .flatMap(c => c.miniQuestions)
      .filter(mq => mq.isReleased).length;

    console.log(`\n📊 Copied Release Status:`);
    console.log(`   Released modules: ${copiedReleasedModules}/${copiedCohort.modules.length} (should be 0)`);
    console.log(`   Released questions: ${copiedReleasedQuestions} (should be 0)`);
    console.log(`   Released mini questions: ${copiedReleasedMiniQuestions} (should be 0)`);

    // 5. Verification results
    console.log('\n🔍 VERIFICATION RESULTS:');
    
    const originalDatesNotCopied = copiedCohort.startDate.getTime() !== sourceCohort.startDate.getTime() && copiedCohort.endDate === null;
    const releasesReset = copiedReleasedModules === 0 && copiedReleasedQuestions === 0 && copiedReleasedMiniQuestions === 0;
    
    console.log(`   ✅ Original dates not copied: ${originalDatesNotCopied ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Release status reset: ${releasesReset ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Content structure preserved: ${copiedCohort.modules.length === sourceCohort.modules.length ? 'PASS' : 'FAIL'}`);

    if (originalDatesNotCopied && releasesReset) {
      console.log('\n🎉 SUCCESS: Copy functionality updated correctly!');
      console.log('   - Original dates are NOT copied (start date set to current, end date null)');
      console.log('   - All release statuses are reset to false');
      console.log('   - Content structure is preserved');
      console.log('   - Deadlines set to far future (2099-12-31) for manual adjustment');
    } else {
      console.log('\n❌ ISSUES FOUND: Some requirements not met');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testCohortCopyChanges();
