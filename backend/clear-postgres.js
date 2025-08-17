const { PrismaClient } = require('@prisma/client');

const postgresqlPrisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log('🧹 Clearing PostgreSQL database...');

    // Delete in reverse dependency order
    await postgresqlPrisma.miniAnswer.deleteMany({});
    console.log('✅ Cleared mini answers');

    await postgresqlPrisma.miniQuestion.deleteMany({});
    console.log('✅ Cleared mini questions');

    await postgresqlPrisma.answer.deleteMany({});
    console.log('✅ Cleared answers');

    await postgresqlPrisma.question.deleteMany({});
    console.log('✅ Cleared questions');

    await postgresqlPrisma.content.deleteMany({});
    console.log('✅ Cleared contents');

    await postgresqlPrisma.cohortMember.deleteMany({});
    console.log('✅ Cleared cohort members');

    await postgresqlPrisma.gameConfig.deleteMany({});
    console.log('✅ Cleared game configs');

    await postgresqlPrisma.module.deleteMany({});
    console.log('✅ Cleared modules');

    await postgresqlPrisma.cohort.deleteMany({});
    console.log('✅ Cleared cohorts');

    await postgresqlPrisma.user.deleteMany({});
    console.log('✅ Cleared users');

    console.log('🎉 Database cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await postgresqlPrisma.$disconnect();
  }
}

clearDatabase();
