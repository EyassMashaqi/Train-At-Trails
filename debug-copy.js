// Simple test to debug the copy API
const axios = require('axios');

async function testAPI() {
  try {
    const baseURL = 'http://localhost:3000/api';
    
    // Login
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@traintrails.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Login successful');
    
    // Test the copy endpoint directly
    const cohortId = 'cmdx1vv1s000012q6cd3rlg1q'; // test1111 cohort
    
    console.log('📋 Testing copy endpoint...');
    
    const response = await axios.post(
      `${baseURL}/admin/cohorts/${cohortId}/copy`,
      {
        newName: 'Debug Copy Test',
        newCohortNumber: 888
      },
      { headers }
    );
    
    console.log('✅ Success:', response.data);
    
  } catch (error) {
    console.error('❌ Error details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAPI();
