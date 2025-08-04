const axios = require('axios');

async function testUserManagement() {
  try {
    // First login as admin
    console.log('Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@traintrails.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');

    // Test get users endpoint
    console.log('\nTesting users endpoint...');
    const usersResponse = await axios.get('http://localhost:3000/api/admin/cohorts/users/all', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Users endpoint successful');
    console.log('Users count:', usersResponse.data.users?.length || 0);

    // Test get cohorts endpoint
    console.log('\nTesting cohorts endpoint...');
    const cohortsResponse = await axios.get('http://localhost:3000/api/admin/cohorts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Cohorts endpoint successful');
    console.log('Cohorts count:', cohortsResponse.data.cohorts?.length || 0);

    console.log('\n🎉 All UserManagement API endpoints are working!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testUserManagement();
