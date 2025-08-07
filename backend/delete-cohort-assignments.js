const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteCohortAssignments() {
  console.log('🗑️  Starting deletion of user cohort assignment data...\n');
  
  try {
    // Get current state before deletion
    const beforeState = {
      cohortMembers: await prisma.cohortMember.count(),
      answers: await prisma.answer.count(),
      miniAnswers: await prisma.miniAnswer.count(),
      usersWithCurrentCohort: await prisma.user.count({
        where: { currentCohortId: { not: null } }
      })
    };

    console.log('📊 Current state:');
    console.log(`   • Cohort Memberships: ${beforeState.cohortMembers}`);
    console.log(`   • User Answers: ${beforeState.answers}`);
    console.log(`   • Mini Answers: ${beforeState.miniAnswers}`);
    console.log(`   • Users with Active Cohort: ${beforeState.usersWithCurrentCohort}\n`);

    // Confirm deletion
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const confirmation = await new Promise((resolve) => {
      rl.question('⚠️  This will delete ALL user cohort assignment data but preserve users and cohorts. Continue? (type "DELETE" to confirm): ', resolve);
    });
    rl.close();

    if (confirmation !== 'DELETE') {
      console.log('❌ Operation cancelled.');
      return;
    }

    console.log('\n🔄 Starting deletion process...\n');

    // Step 1: Delete mini answers (user submissions to mini-questions)
    console.log('1️⃣  Deleting mini answers...');
    const deletedMiniAnswers = await prisma.miniAnswer.deleteMany({});
    console.log(`   ✅ Deleted ${deletedMiniAnswers.count} mini answers\n`);

    // Step 2: Delete answers (user submissions to questions)
    console.log('2️⃣  Deleting user answers...');
    const deletedAnswers = await prisma.answer.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAnswers.count} answers\n`);

    // Step 3: Delete cohort memberships
    console.log('3️⃣  Deleting cohort memberships...');
    const deletedCohortMembers = await prisma.cohortMember.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCohortMembers.count} cohort memberships\n`);

    // Step 4: Reset user current cohort references and progress
    console.log('4️⃣  Resetting user cohort references and progress...');
    const updatedUsers = await prisma.user.updateMany({
      where: { currentCohortId: { not: null } },
      data: { 
        currentCohortId: null,
        currentStep: 0
      }
    });
    console.log(`   ✅ Reset current cohort for ${updatedUsers.count} users\n`);

    // Verify final state
    const afterState = {
      cohortMembers: await prisma.cohortMember.count(),
      answers: await prisma.answer.count(),
      miniAnswers: await prisma.miniAnswer.count(),
      usersWithCurrentCohort: await prisma.user.count({
        where: { currentCohortId: { not: null } }
      }),
      totalUsers: await prisma.user.count(),
      totalCohorts: await prisma.cohort.count()
    };

    console.log('✅ Deletion completed successfully!\n');
    console.log('📊 Final state:');
    console.log(`   • Cohort Memberships: ${afterState.cohortMembers} (was ${beforeState.cohortMembers})`);
    console.log(`   • User Answers: ${afterState.answers} (was ${beforeState.answers})`);
    console.log(`   • Mini Answers: ${afterState.miniAnswers} (was ${beforeState.miniAnswers})`);
    console.log(`   • Users with Active Cohort: ${afterState.usersWithCurrentCohort} (was ${beforeState.usersWithCurrentCohort})`);
    console.log(`   • Total Users: ${afterState.totalUsers} (preserved)`);
    console.log(`   • Total Cohorts: ${afterState.totalCohorts} (preserved)\n`);

    console.log('🎯 Summary of what was deleted:');
    console.log(`   • ${deletedMiniAnswers.count} mini answers`);
    console.log(`   • ${deletedAnswers.count} user answers`);
    console.log(`   • ${deletedCohortMembers.count} cohort memberships`);
    console.log(`   • ${updatedUsers.count} user cohort references reset\n`);
    
    console.log('💡 What remains:');
    console.log('   • All user accounts with login credentials');
    console.log('   • All cohort structures');
    console.log('   • All modules and questions (content preserved)');
    console.log('   • All mini-questions and content (structure preserved)\n');
    
    console.log('🚀 Users can now be reassigned to cohorts with fresh progress tracking.');

  } catch (error) {
    console.error('❌ Error during deletion:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the deletion
deleteCohortAssignments()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
