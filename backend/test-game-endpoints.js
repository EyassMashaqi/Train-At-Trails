const axios = require('axios');

async function testGameEndpoint() {
  try {
    // First, login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'alice@traintrails.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Test the modules endpoint that was causing 500 errors
    console.log('📦 Testing modules endpoint...');
    const modulesResponse = await axios.get('http://localhost:3000/api/game/modules', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Modules endpoint working');
    console.log('📊 Modules data:', JSON.stringify(modulesResponse.data, null, 2));

    // Test the status endpoint
    console.log('📊 Testing status endpoint...');
    const statusResponse = await axios.get('http://localhost:3000/api/game/status', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Status endpoint working');
    console.log('🎯 Status data:', JSON.stringify(statusResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testGameEndpoint();
