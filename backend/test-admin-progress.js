const axios = require('axios');

async function testAdminProgress() {
  try {
    console.log('🔍 Testing admin progress endpoint fix...\n');

    // First, login as admin
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@traintrails.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');

    // Test the progress endpoint that was failing
    const progressResponse = await axios.get('http://localhost:3000/api/game/progress', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Progress endpoint successful!');
    console.log('📊 Response data:', {
      totalSteps: progressResponse.data.totalSteps,
      currentStep: progressResponse.data.currentStep,
      questionsCount: progressResponse.data.questions?.length || 0
    });

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAdminProgress();
