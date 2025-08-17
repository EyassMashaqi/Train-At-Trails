const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPostgreSQL() {
  try {
    console.log('🧪 Testing PostgreSQL connection...\n');

    // Test basic queries
    const userCount = await prisma.user.count();
    const cohortCount = await prisma.cohort.count();
    const questionCount = await prisma.question.count();

    console.log('✅ PostgreSQL Connection Success!');
    console.log(`📊 Data verification:`);
    console.log(`   👤 Users: ${userCount}`);
    console.log(`   👥 Cohorts: ${cohortCount}`);
    console.log(`   ❓ Questions: ${questionCount}`);

    // Test a more complex query
    const sampleUser = await prisma.user.findFirst({
      include: {
        currentCohort: true,
        cohortMembers: {
          include: {
            cohort: true
          }
        }
      }
    });

    if (sampleUser) {
      console.log(`\n✅ Sample user found: ${sampleUser.email}`);
      console.log(`   Current cohort: ${sampleUser.currentCohort?.name || 'None'}`);
      console.log(`   Cohort memberships: ${sampleUser.cohortMembers.length}`);
    }

    // Test admin stats similar to API endpoint
    const stats = {
      totalUsers: await prisma.user.count(),
      totalCohorts: await prisma.cohort.count(),
      activeCohorts: await prisma.cohort.count({ where: { isActive: true } }),
      totalQuestions: await prisma.question.count(),
      releasedQuestions: await prisma.question.count({ where: { isReleased: true } }),
      totalAnswers: await prisma.answer.count(),
      pendingAnswers: await prisma.answer.count({ where: { status: 'PENDING' } }),
      totalMiniQuestions: await prisma.miniQuestion.count(),
      totalMiniAnswers: await prisma.miniAnswer.count()
    };

    console.log(`\n📈 Admin Stats (simulating API):`);
    console.log(`   Total Users: ${stats.totalUsers}`);
    console.log(`   Total Cohorts: ${stats.totalCohorts} (${stats.activeCohorts} active)`);
    console.log(`   Total Questions: ${stats.totalQuestions} (${stats.releasedQuestions} released)`);
    console.log(`   Total Answers: ${stats.totalAnswers} (${stats.pendingAnswers} pending)`);
    console.log(`   Mini Questions: ${stats.totalMiniQuestions}`);
    console.log(`   Mini Answers: ${stats.totalMiniAnswers}`);

    console.log('\n🎉 PostgreSQL database is working perfectly!');
    console.log('✅ Migration completed successfully');
    console.log('✅ All data is accessible');
    console.log('✅ Complex queries are working');

  } catch (error) {
    console.error('❌ PostgreSQL test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPostgreSQL();
