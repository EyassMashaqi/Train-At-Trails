const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserCohortData() {
  try {
    console.log('🔍 COMPREHENSIVE COHORT DATA CHECK\n');
    
    // 1. Find the test user
    const testUser = await prisma.user.findFirst({
      where: { email: 'test@traintrails.com' }
    });
    
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log('👤 USER INFORMATION:');
    console.log(`   Email: ${testUser.email}`);
    console.log(`   ID: ${testUser.id}`);
    console.log(`   Full Name: ${testUser.fullName}`);
    console.log(`   Current Cohort ID: ${testUser.currentCohortId || 'None'}`);
    
    // 2. Find user's active cohort membership
    const activeMembership = await prisma.cohortMember.findFirst({
      where: {
        userId: testUser.id,
        isActive: true
      },
      include: {
        cohort: true
      }
    });
    
    if (!activeMembership) {
      console.log('❌ User has no active cohort membership');
      return;
    }
    
    console.log(`   Active Membership Cohort: ${activeMembership.cohort.name} (ID: ${activeMembership.cohort.id})\n`);
    
    // 3. Check what cohorts exist and their modules
    const allCohorts = await prisma.cohort.findMany({
      include: {
        _count: {
          select: {
            modules: true,
            cohortMembers: true
          }
        }
      }
    });
    
    console.log('🏢 ALL COHORTS AND THEIR MODULES:');
    for (const cohort of allCohorts) {
      console.log(`   ${cohort.name} (ID: ${cohort.id.substring(0, 8)}...)`);
      console.log(`     Active: ${cohort.isActive}`);
      console.log(`     Modules: ${cohort._count.modules}`);
      console.log(`     Members: ${cohort._count.cohortMembers}`);
      
      // Get actual modules for this cohort
      const modules = await prisma.module.findMany({
        where: { cohortId: cohort.id },
        select: { 
          id: true, 
          moduleNumber: true, 
          title: true, 
          isReleased: true 
        },
        orderBy: { moduleNumber: 'asc' }
      });
      
      modules.forEach(module => {
        console.log(`       Module ${module.moduleNumber}: ${module.title} (Released: ${module.isReleased})`);
      });
      console.log('');
    }
    
    // 4. Show what the API should return for this user
    console.log('🔧 SIMULATING API MODULES ENDPOINT...');
    const apiModules = await prisma.module.findMany({
      where: {
        cohortId: activeMembership.cohortId
      },
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
      },
      orderBy: { moduleNumber: 'asc' }
    });
    
    console.log(`✅ API should return ${apiModules.length} modules for cohort: ${activeMembership.cohort.name}`);
    apiModules.forEach(module => {
      console.log(`   Module ${module.moduleNumber}: ${module.title}`);
      console.log(`     Released: ${module.isReleased}`);
      console.log(`     Topics/Questions: ${module.questions.length}`);
      module.questions.forEach(q => {
        console.log(`       Question ${q.questionNumber}: ${q.title} (Released: ${q.isReleased})`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserCohortData().catch(console.error);
