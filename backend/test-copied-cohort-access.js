const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function testCopiedCohortAccess() {
  console.log('=== Testing Copied Cohort Access ===\n');

  try {
    // 1. Get admin token
    const adminLoginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      trainName: 'admin',
      password: 'admin123'
    });
    
    const adminToken = adminLoginResponse.data.token;
    console.log('✅ Admin logged in successfully\n');

    // 2. Find an inactive cohort (copied cohorts are created inactive)
    const inactiveCohorts = await prisma.cohort.findMany({
      where: { isActive: false },
      select: { id: true, name: true, isActive: true }
    });

    console.log('Found inactive cohorts:', inactiveCohorts.length);
    inactiveCohorts.forEach(cohort => {
      console.log(`  - ${cohort.name} (${cohort.id}) - Active: ${cohort.isActive}`);
    });
    console.log('');

    if (inactiveCohorts.length === 0) {
      console.log('⚠️ No inactive cohorts found. Creating a test inactive cohort...');
      
      // Create a test inactive cohort
      const testCohort = await prisma.cohort.create({
        data: {
          name: 'Test Inactive Cohort',
          description: 'Test cohort for inactive access testing',
          isActive: false,
          trainName: 'Test Train',
          maxParticipants: 10,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
      
      inactiveCohorts.push(testCohort);
      console.log(`✅ Created test inactive cohort: ${testCohort.name} (${testCohort.id})\n`);
    }

    // 3. Test admin dashboard endpoints with inactive cohort
    const testCohort = inactiveCohorts[0];
    console.log(`=== Testing admin access to inactive cohort: ${testCohort.name} ===\n`);

    // Test stats endpoint
    try {
      const statsResponse = await axios.get(`http://localhost:3001/api/admin/stats?cohortId=${testCohort.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ Stats endpoint successful for inactive cohort');
      console.log(`   Response: ${JSON.stringify(statsResponse.data)}\n`);
    } catch (error) {
      console.log('❌ Stats endpoint failed for inactive cohort');
      console.log(`   Error: ${error.response?.status} - ${error.response?.data?.error || error.message}\n`);
    }

    // Test pending-answers endpoint
    try {
      const pendingResponse = await axios.get(`http://localhost:3001/api/admin/pending-answers?cohortId=${testCohort.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ Pending-answers endpoint successful for inactive cohort');
      console.log(`   Response: Found ${pendingResponse.data.length} pending answers\n`);
    } catch (error) {
      console.log('❌ Pending-answers endpoint failed for inactive cohort');
      console.log(`   Error: ${error.response?.status} - ${error.response?.data?.error || error.message}\n`);
    }

    // 4. Compare with active cohort access
    const activeCohorts = await prisma.cohort.findMany({
      where: { isActive: true },
      select: { id: true, name: true, isActive: true },
      take: 1
    });

    if (activeCohorts.length > 0) {
      const activeCohort = activeCohorts[0];
      console.log(`=== Comparing with active cohort: ${activeCohort.name} ===\n`);

      try {
        const statsResponse = await axios.get(`http://localhost:3001/api/admin/stats?cohortId=${activeCohort.id}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Stats endpoint successful for active cohort');
      } catch (error) {
        console.log('❌ Stats endpoint failed for active cohort');
        console.log(`   Error: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }

      try {
        const pendingResponse = await axios.get(`http://localhost:3001/api/admin/pending-answers?cohortId=${activeCohort.id}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Pending-answers endpoint successful for active cohort');
      } catch (error) {
        console.log('❌ Pending-answers endpoint failed for active cohort');
        console.log(`   Error: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }
    }

    console.log('\n=== Summary ===');
    console.log('If both active and inactive cohorts work, the fix is successful!');
    console.log('Copied cohorts should now be accessible in the admin dashboard.');

  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testCopiedCohortAccess();
