const fetch = require('node-fetch');

async function testModuleAPI() {
  try {
    console.log('Testing Module API endpoints...');
    
    // Test: Get all modules
    const response = await fetch('http://localhost:3000/api/admin/modules', {
      headers: {
        'Authorization': 'Bearer test-token' // This might fail due to auth, but we can see if the endpoint responds
      }
    });
    
    console.log('GET /api/admin/modules status:', response.status);
    
    if (response.status === 401) {
      console.log('✅ API endpoint is accessible (expected 401 due to missing auth)');
    } else {
      const data = await response.text();
      console.log('Response:', data.substring(0, 100) + '...');
    }
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testModuleAPI();
