const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCohortIsolation() {
  try {
    console.log('🔧 Starting Cohort Isolation Fix...\n');

    // Step 1: Check current cohort memberships
    console.log('📊 Current Cohort Memberships:');
    const users = await prisma.user.findMany({
      where: { isAdmin: false },
      include: {
        cohortMembers: {
          include: {
            cohort: true
          }
        }
      }
    });

    users.forEach(user => {
      console.log(`\n👤 ${user.fullName} (${user.email})`);
      console.log(`   Current Cohort ID: ${user.currentCohortId}`);
      user.cohortMembers.forEach(membership => {
        console.log(`   - ${membership.cohort.name}: ${membership.status} (Active: ${membership.isActive})`);
      });
    });

    // Step 2: Ensure each user has only one ENROLLED membership
    console.log('\n🔍 Checking for multiple ENROLLED memberships...');
    for (const user of users) {
      const enrolledMemberships = user.cohortMembers.filter(m => m.status === 'ENROLLED');
      
      if (enrolledMemberships.length > 1) {
        console.log(`⚠️  User ${user.fullName} has ${enrolledMemberships.length} ENROLLED memberships`);
        
        // Keep the most recent enrollment, set others to GRADUATED
        const sortedMemberships = enrolledMemberships.sort((a, b) => 
          new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
        );
        
        for (let i = 1; i < sortedMemberships.length; i++) {
          await prisma.cohortMember.update({
            where: { id: sortedMemberships[i].id },
            data: { status: 'GRADUATED' }
          });
          console.log(`   ✅ Changed ${sortedMemberships[i].cohort.name} membership to GRADUATED`);
        }
      } else if (enrolledMemberships.length === 1) {
        console.log(`✅ User ${user.fullName} has exactly 1 ENROLLED membership: ${enrolledMemberships[0].cohort.name}`);
        
        // Ensure currentCohortId matches the enrolled cohort
        if (user.currentCohortId !== enrolledMemberships[0].cohortId) {
          await prisma.user.update({
            where: { id: user.id },
            data: { currentCohortId: enrolledMemberships[0].cohortId }
          });
          console.log(`   🔄 Updated currentCohortId to match enrolled cohort`);
        }
      } else {
        console.log(`❌ User ${user.fullName} has NO ENROLLED memberships`);
      }
    }

    // Step 3: Verify module-cohort assignments
    console.log('\n📚 Module-Cohort Assignments:');
    const modules = await prisma.module.findMany({
      include: {
        cohort: true,
        questions: {
          select: {
            questionNumber: true,
            title: true
          }
        }
      },
      orderBy: [
        { cohortId: 'asc' },
        { moduleNumber: 'asc' }
      ]
    });

    let currentCohortId = null;
    modules.forEach(module => {
      if (module.cohortId !== currentCohortId) {
        currentCohortId = module.cohortId;
        console.log(`\n🏫 ${module.cohort.name}:`);
      }
      console.log(`   📖 Module ${module.moduleNumber}: ${module.title} (${module.questions.length} questions)`);
    });

    // Step 4: Test API simulation for test user
    console.log('\n🧪 Testing API Logic for Test User...');
    const testUser = await prisma.user.findFirst({
      where: { email: 'test@traintrails.com' }
    });

    if (testUser) {
      const userCohort = await prisma.cohortMember.findFirst({
        where: { 
          userId: testUser.id,
          status: 'ENROLLED'
        },
        include: {
          cohort: true
        }
      });

      if (userCohort) {
        console.log(`🎯 Test user's active cohort: ${userCohort.cohort.name} (ID: ${userCohort.cohortId})`);
        
        const userModules = await prisma.module.findMany({
          where: {
            cohortId: userCohort.cohortId
          },
          include: {
            questions: {
              select: {
                questionNumber: true,
                title: true
              }
            }
          }
        });

        console.log(`📚 Modules that should be returned for test user:`);
        userModules.forEach(module => {
          console.log(`   - Module ${module.moduleNumber}: ${module.title}`);
          module.questions.forEach(q => {
            console.log(`     • Q${q.questionNumber}: ${q.title}`);
          });
        });
      } else {
        console.log('❌ Test user has no active cohort membership!');
      }
    } else {
      console.log('❌ Test user not found!');
    }

    console.log('\n✅ Cohort isolation fix completed!');
    console.log('\n💡 Recommended next steps:');
    console.log('   1. Clear browser cache and localStorage');
    console.log('   2. Logout and login again');
    console.log('   3. Test the game view to verify correct modules are shown');

  } catch (error) {
    console.error('❌ Error during cohort isolation fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCohortIsolation();
