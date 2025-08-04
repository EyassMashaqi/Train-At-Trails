const axios = require('axios');

async function testDefaultCohortAssignment() {
  try {
    console.log('🧪 Testing Default Cohort Assignment...\n');

    // Test registration with automatic cohort assignment
    console.log('1️⃣ Registering a new test user...');
    
    const registrationData = {
      email: `test${Date.now()}@example.com`,
      password: 'testpass123',
      fullName: 'Test User for Cohort Assignment',
      trainName: 'Test Train'
    };

    try {
      const registerResponse = await axios.post('http://localhost:3000/api/auth/register', registrationData);
      console.log('✅ User registered successfully');
      console.log('📧 Email:', registerResponse.data.user.email);
      console.log('👤 Full Name:', registerResponse.data.user.fullName);
      
      // Check if user was assigned to Default Cohort
      const token = registerResponse.data.token;
      
      console.log('\n2️⃣ Checking Default Cohort assignment...');
      const userDataResponse = await axios.get('http://localhost:3000/api/admin/cohorts/users/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newUser = userDataResponse.data.users.find(u => u.email === registrationData.email);
      if (newUser && newUser.cohortMembers && newUser.cohortMembers.length > 0) {
        console.log('✅ User automatically assigned to cohort:');
        console.log('🏫 Cohort Name:', newUser.cohortMembers[0].cohort.name);
        console.log('📅 Joined At:', newUser.cohortMembers[0].joinedAt);
      } else {
        console.log('⚠️ User was not assigned to any cohort');
      }

    } catch (registerError) {
      if (registerError.response?.status === 400 && registerError.response?.data?.error?.includes('already exists')) {
        console.log('ℹ️ Test user already exists, skipping registration test');
      } else {
        throw registerError;
      }
    }

    console.log('\n3️⃣ Checking current cohorts...');
    
    // Login as admin to check cohorts
    const adminLoginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@traintrails.com',
      password: 'admin123'
    });

    const adminToken = adminLoginResponse.data.token;
    const cohortsResponse = await axios.get('http://localhost:3000/api/admin/cohorts', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('📋 Available Cohorts:');
    cohortsResponse.data.cohorts.forEach(cohort => {
      console.log(`   • ${cohort.name} (${cohort.isActive ? 'Active' : 'Inactive'}) - ${cohort._count?.cohortMembers || 0} members`);
    });

    console.log('\n🎉 Default Cohort assignment test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDefaultCohortAssignment();
