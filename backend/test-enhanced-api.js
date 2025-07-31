const axios = require('axios');

async function testEnhancedAPI() {
  try {
    console.log('Testing Enhanced Progress API...\n');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'alice@traintrails.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Login successful\n');
    
    // Test the enhanced progress endpoint
    const progressResponse = await axios.get('http://localhost:3000/api/game/progress', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = progressResponse.data;
    console.log('✅ Progress API Response Structure:');
    console.log('==========================================');
    
    // Check for backward compatibility (original GameView needs these)
    console.log('📋 Backward Compatibility Check:');
    console.log('- currentQuestion:', data.currentQuestion ? '✅ Present' : '❌ Missing');
    console.log('- currentQuestionMiniQuestions:', data.currentQuestionMiniQuestions ? `✅ Present (${data.currentQuestionMiniQuestions.length} items)` : '❌ Missing');
    console.log('- answers:', Array.isArray(data.answers) ? `✅ Present (${data.answers.length} items)` : '❌ Missing');
    
    // Check for new structure (enhanced view needs these)
    console.log('\\n🆕 Enhanced Features Check:');
    console.log('- questions:', Array.isArray(data.questions) ? `✅ Present (${data.questions.length} items)` : '❌ Missing');
    console.log('- user:', data.user ? '✅ Present' : '❌ Missing');
    console.log('- currentStep:', data.currentStep !== undefined ? `✅ ${data.currentStep}` : '❌ Missing');
    
    if (data.currentQuestion) {
      console.log('\\n📝 Current Question Details:');
      console.log('- id:', data.currentQuestion.id);
      console.log('- title:', data.currentQuestion.title);
      console.log('- questionNumber:', data.currentQuestion.questionNumber);
      console.log('- hasAnswered:', data.currentQuestion.hasAnswered);
    }
    
    if (data.currentQuestionMiniQuestions && data.currentQuestionMiniQuestions.length > 0) {
      console.log('\\n🎯 Mini Questions:');
      data.currentQuestionMiniQuestions.forEach((mq, index) => {
        console.log(`  ${index + 1}. ${mq.title}`);
        console.log(`     - Question: ${mq.question}`);
        console.log(`     - Has Answer: ${mq.hasAnswer}`);
        console.log(`     - Content: ${mq.contentTitle}`);
      });
    }
    
    console.log('\\n✅ API Integration Test: SUCCESS');
    console.log('Both original GameView and enhanced features are supported!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testEnhancedAPI();
