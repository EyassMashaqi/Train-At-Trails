const fs = require('fs');
const path = require('path');

// Load axios from backend node_modules
const backendDir = path.join(__dirname, 'backend');
const axios = require(path.join(backendDir, 'node_modules', 'axios')).default;

async function testProgressAPI() {
  try {
    console.log('Testing Progress API Structure...\n');
    
    // First login to get a token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/auth/login', {
      email: 'alice@traintrails.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Login successful\n');
    
    // Test progress endpoint
    console.log('2. Testing /game/progress endpoint...');
    const progressResponse = await axios.get('http://localhost:3000/game/progress', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = progressResponse.data;
    console.log('✅ Progress API call successful\n');
    
    // Check structure
    console.log('3. Validating API Response Structure:');
    console.log('   Root level properties:');
    console.log('   - user:', data.user ? '✅ exists' : '❌ missing');
    console.log('   - currentStep:', data.currentStep !== undefined ? `✅ ${data.currentStep}` : '❌ missing');
    console.log('   - totalSteps:', data.totalSteps !== undefined ? `✅ ${data.totalSteps}` : '❌ missing');
    console.log('   - questions:', Array.isArray(data.questions) ? `✅ array (${data.questions.length} items)` : '❌ not array');
    
    if (data.user) {
      console.log('   - user.fullName:', data.user.fullName ? `✅ "${data.user.fullName}"` : '❌ missing');
      console.log('   - user.trainName:', data.user.trainName ? `✅ "${data.user.trainName}"` : '❌ missing');
    }
    
    if (data.questions && data.questions.length > 0) {
      const firstQuestion = data.questions[0];
      console.log('\n   First question properties:');
      console.log('   - id:', firstQuestion.id ? '✅ exists' : '❌ missing');
      console.log('   - title:', firstQuestion.title ? `✅ "${firstQuestion.title}"` : '❌ missing');
      console.log('   - status:', firstQuestion.status ? `✅ "${firstQuestion.status}"` : '❌ missing');
      console.log('   - contents:', Array.isArray(firstQuestion.contents) ? `✅ array (${firstQuestion.contents.length} items)` : '❌ not array');
      console.log('   - miniQuestionProgress:', firstQuestion.miniQuestionProgress ? '✅ exists' : '❌ missing');
      
      if (firstQuestion.miniQuestionProgress) {
        const mp = firstQuestion.miniQuestionProgress;
        console.log('     - total:', mp.total !== undefined ? `✅ ${mp.total}` : '❌ missing');
        console.log('     - completed:', mp.completed !== undefined ? `✅ ${mp.completed}` : '❌ missing');
        console.log('     - percentage:', mp.percentage !== undefined ? `✅ ${mp.percentage}%` : '❌ missing');
      }
    }
    
    console.log('\n4. Full Response Sample:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testProgressAPI();
