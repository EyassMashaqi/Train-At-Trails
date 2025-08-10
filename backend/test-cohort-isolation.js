const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCohortIsolation() {
  try {
    console.log('=== Testing Cohort Isolation ===\n');

    // 1. Check current cohort setup
    console.log('1. Current cohorts:');
    const cohorts = await prisma.cohort.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true }
    });
    cohorts.forEach(cohort => {
      console.log(`   - ${cohort.name} (${cohort.id})`);
    });

    // 2. Check users and their cohort memberships
    console.log('\n2. Users and their cohort memberships:');
    const users = await prisma.user.findMany({
      where: { isAdmin: false },
      include: {
        cohortMembers: {
          where: { status: 'ENROLLED' },
          include: {
            cohort: { select: { name: true } }
          }
        }
      },
      take: 10
    });
    
    users.forEach(user => {
      const cohortNames = user.cohortMembers.map(cm => cm.cohort.name).join(', ');
      console.log(`   - ${user.fullName} (${user.email}) -> Cohorts: [${cohortNames}]`);
    });

    // 3. Check questions per cohort
    console.log('\n3. Questions per cohort:');
    const questionStats = await prisma.question.groupBy({
      by: ['cohortId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    
    for (const stat of questionStats) {
      const cohort = await prisma.cohort.findUnique({
        where: { id: stat.cohortId },
        select: { name: true }
      });
      console.log(`   - Cohort ${cohort?.name || stat.cohortId}: ${stat._count.id} questions`);
    }

    // 4. Check answers per cohort  
    console.log('\n4. Answers per cohort:');
    const answerStats = await prisma.answer.groupBy({
      by: ['cohortId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    
    for (const stat of answerStats) {
      const cohort = await prisma.cohort.findUnique({
        where: { id: stat.cohortId },
        select: { name: true }
      });
      console.log(`   - Cohort ${cohort?.name || stat.cohortId}: ${stat._count.id} answers`);
    }

    // 5. Check for potential isolation violations
    console.log('\n5. Potential isolation violations:');
    const answers = await prisma.answer.findMany({
      include: {
        user: { 
          select: { 
            fullName: true,
            cohortMembers: {
              where: { status: 'ENROLLED' },
              select: { cohortId: true }
            }
          }
        },
        cohort: { select: { name: true } }
      }
    });

    let violations = 0;
    answers.forEach(answer => {
      const userCohortIds = answer.user.cohortMembers.map(cm => cm.cohortId);
      if (!userCohortIds.includes(answer.cohortId)) {
        console.log(`   ⚠️  VIOLATION: ${answer.user.fullName} answered in cohort '${answer.cohort?.name}' but is not a member!`);
        violations++;
      }
    });

    if (violations === 0) {
      console.log('   ✅ No violations found - cohort isolation is working correctly!');
    } else {
      console.log(`   ❌ Found ${violations} isolation violations!`);
    }

    // 6. Test specific isolation scenarios
    console.log('\n6. Testing isolation scenarios:');
    
    // Find a question that exists in multiple cohorts (if any)
    const questionsByTitle = await prisma.question.groupBy({
      by: ['title'],
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } }
    });

    if (questionsByTitle.length > 0) {
      console.log('   Questions that exist in multiple cohorts:');
      for (const q of questionsByTitle) {
        const questions = await prisma.question.findMany({
          where: { title: q.title },
          include: { cohort: { select: { name: true } } }
        });
        
        console.log(`   - "${q.title}" exists in:`);
        questions.forEach(question => {
          console.log(`     * ${question.cohort.name} cohort`);
        });
      }
    } else {
      console.log('   ✅ Each question title is unique per cohort');
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCohortIsolation();
