const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetAppData() {
  try {
    console.log('🔄 Starting application data reset...');
    console.log('⚠️  This will clear all questions, answers, modules, and user progress while keeping user accounts');
    
    // Clear data in the correct order to respect foreign key constraints
    
    console.log('🗑️  Deleting mini answers...');
    const deletedMiniAnswers = await prisma.miniAnswer.deleteMany({});
    console.log(`   Deleted ${deletedMiniAnswers.count} mini answers`);
    
    console.log('🗑️  Deleting mini questions...');
    const deletedMiniQuestions = await prisma.miniQuestion.deleteMany({});
    console.log(`   Deleted ${deletedMiniQuestions.count} mini questions`);
    
    console.log('🗑️  Deleting content sections...');
    const deletedContents = await prisma.content.deleteMany({});
    console.log(`   Deleted ${deletedContents.count} content sections`);
    
    console.log('🗑️  Deleting answers...');
    const deletedAnswers = await prisma.answer.deleteMany({});
    console.log(`   Deleted ${deletedAnswers.count} answers`);
    
    console.log('🗑️  Deleting questions/assignments...');
    const deletedQuestions = await prisma.question.deleteMany({});
    console.log(`   Deleted ${deletedQuestions.count} questions/assignments`);
    
    console.log('🗑️  Deleting modules...');
    const deletedModules = await prisma.module.deleteMany({});
    console.log(`   Deleted ${deletedModules.count} modules`);
    
    console.log('🔄 Resetting user progress...');
    const updatedUsers = await prisma.user.updateMany({
      data: {
        currentStep: 0
      }
    });
    console.log(`   Reset progress for ${updatedUsers.count} users`);
    
    console.log('🗑️  Deleting cohort memberships (keeping cohorts)...');
    const deletedMemberships = await prisma.cohortMember.deleteMany({});
    console.log(`   Deleted ${deletedMemberships.count} cohort memberships`);
    
    console.log('✅ Application data reset completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Mini Answers: ${deletedMiniAnswers.count} deleted`);
    console.log(`   - Mini Questions: ${deletedMiniQuestions.count} deleted`);
    console.log(`   - Content Sections: ${deletedContents.count} deleted`);
    console.log(`   - Answers: ${deletedAnswers.count} deleted`);
    console.log(`   - Questions/Assignments: ${deletedQuestions.count} deleted`);
    console.log(`   - Modules: ${deletedModules.count} deleted`);
    console.log(`   - User Progress: ${updatedUsers.count} users reset`);
    console.log(`   - Cohort Memberships: ${deletedMemberships.count} deleted`);
    console.log('');
    console.log('👥 User accounts preserved:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        trainName: true,
        currentStep: true,
        isAdmin: true
      }
    });
    
    users.forEach(user => {
      console.log(`   - ${user.fullName} (${user.email}) - Train: ${user.trainName} - Step: ${user.currentStep} ${user.isAdmin ? '(Admin)' : ''}`);
    });
    
    console.log('');
    console.log('🏮 Application is now in fresh state - ready for new content!');
    
  } catch (error) {
    console.error('❌ Error resetting application data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Add confirmation check
async function confirmReset() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('⚠️  WARNING: This will permanently delete all:');
    console.log('   - Questions and Assignments');
    console.log('   - User Answers and Progress');
    console.log('   - Modules and Content');
    console.log('   - Mini Questions and Answers');
    console.log('   - Cohort Memberships');
    console.log('');
    console.log('✅ This will preserve:');
    console.log('   - User accounts and login credentials');
    console.log('   - Cohort definitions');
    console.log('   - Admin permissions');
    console.log('');
    
    rl.question('Are you sure you want to proceed? Type "YES" to confirm: ', (answer) => {
      rl.close();
      resolve(answer === 'YES');
    });
  });
}

async function main() {
  try {
    const confirmed = await confirmReset();
    
    if (!confirmed) {
      console.log('❌ Reset cancelled by user');
      return;
    }
    
    await resetAppData();
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { resetAppData };
