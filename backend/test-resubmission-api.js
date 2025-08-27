const axios = require('axios');

async function testResubmissionAPI() {
  try {
    // Test with a user who has approved resubmission
    const userEmail = 'yousef.isaifan@gmail.com'; // Carol Davis has approved resubmissions
    const password = '123456'; // Assuming this is the test password
    
    console.log('=== Testing Resubmission API ===\n');
    
    // 1. Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/auth/login', {
      email: userEmail,
      password: password
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // 2. Get modules to see if resubmittable questions appear
    console.log('\n2. Getting modules...');
    const modulesResponse = await axios.get('http://localhost:3000/game/modules', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const modules = modulesResponse.data.modules;
    console.log(`Found ${modules.length} modules`);
    
    // 3. Check each topic for resubmission availability
    console.log('\n3. Checking topics for resubmission...');
    modules.forEach((module, moduleIndex) => {
      console.log(`\nModule ${module.moduleNumber}: ${module.title}`);
      console.log(`  Released: ${module.isReleased}, Active: ${module.isActive}`);
      
      module.topics.forEach((topic, topicIndex) => {
        console.log(`  Topic ${topic.topicNumber}: ${topic.title}`);
        console.log(`    Status: ${topic.status}`);
        console.log(`    Released: ${topic.isReleased}, Active: ${topic.isActive}`);
        console.log(`    Has Main Answer: ${topic.hasMainAnswer}`);
        
        if (topic.mainAnswer) {
          console.log(`    Main Answer Grade: ${topic.mainAnswer.grade}`);
          console.log(`    Main Answer Status: ${topic.mainAnswer.status}`);
          console.log(`    Resubmission Requested: ${topic.mainAnswer.resubmissionRequested}`);
          console.log(`    Resubmission Approved: ${topic.mainAnswer.resubmissionApproved}`);
        }
        
        if (topic.status === 'available' && topic.hasMainAnswer) {
          console.log(`    ✅ AVAILABLE FOR RESUBMISSION!`);
        }
      });
    });
    
  } catch (error) {
    console.error('Test error:', error.response?.data || error.message);
  }
}

testResubmissionAPI();
