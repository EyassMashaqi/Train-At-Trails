const axios = require('axios');

async function testProgressAPI() {
  try {
    // First login to get a token
    const loginResponse = await axios.post('http://localhost:3000/auth/login', {
      email: 'alice@traintrails.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('Login successful, token received');
    
    // Test progress endpoint
    const progressResponse = await axios.get('http://localhost:3000/game/progress', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Progress API Response:');
    console.log(JSON.stringify(progressResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testProgressAPI();
