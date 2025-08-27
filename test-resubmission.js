const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testResubmission() {
  try {
    console.log('=== Testing Resubmission Fix ===\n');
    
    // Login
    console.log('1. Logging in...');
    const loginOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const loginData = {
      email: 'yousef.isaifan@gmail.com',
      password: '123456'
    };
    
    const loginResponse = await makeRequest(loginOptions, loginData);
    
    if (loginResponse.status !== 200) {
      console.error('Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Get modules
    console.log('\n2. Getting modules...');
    const modulesOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/game/modules',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const modulesResponse = await makeRequest(modulesOptions);
    
    if (modulesResponse.status !== 200) {
      console.error('Failed to get modules:', modulesResponse.data);
      return;
    }
    
    const modules = modulesResponse.data.modules;
    console.log(`Found ${modules.length} modules`);
    
    // Check for resubmittable topics
    let resubmittableTopics = [];
    modules.forEach((module) => {
      module.topics.forEach((topic) => {
        if (topic.status === 'available' && topic.hasMainAnswer) {
          resubmittableTopics.push({
            module: module.title,
            topic: topic.title,
            status: topic.status,
            mainAnswer: topic.mainAnswer
          });
        }
      });
    });
    
    console.log(`\n3. Found ${resubmittableTopics.length} topics available for resubmission:`);
    resubmittableTopics.forEach((topic, index) => {
      console.log(`${index + 1}. ${topic.module} -> ${topic.topic}`);
      console.log(`   Status: ${topic.status}`);
      if (topic.mainAnswer) {
        console.log(`   Grade: ${topic.mainAnswer.grade}`);
        console.log(`   Resubmission Requested: ${topic.mainAnswer.resubmissionRequested}`);
        console.log(`   Resubmission Approved: ${topic.mainAnswer.resubmissionApproved}`);
      }
      console.log('');
    });
    
    if (resubmittableTopics.length > 0) {
      console.log('✅ SUCCESS: Resubmittable topics are now showing up!');
    } else {
      console.log('❌ ISSUE: No resubmittable topics found');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testResubmission();
