// Test activate/deactivate functionality
const axios = require('axios');

async function testActivateDeactivate() {
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
    
    // Get cohorts
    const cohortsResponse = await axios.get(`${baseURL}/admin/cohorts`, { headers });
    const cohorts = cohortsResponse.data.cohorts;
    
    if (cohorts.length === 0) {
      console.log('❌ No cohorts found');
      return;
    }
    
    const testCohort = cohorts[0];
    console.log(`\n📊 Testing with cohort: #${testCohort.cohortNumber} ${testCohort.name}`);
    console.log(`   Current status: ${testCohort.isActive ? 'Active' : 'Inactive'}`);
    
    // Toggle status
    const newStatus = !testCohort.isActive;
    console.log(`\n🔄 Toggling to: ${newStatus ? 'Active' : 'Inactive'}`);
    
    const updateResponse = await axios.patch(
      `${baseURL}/admin/cohorts/${testCohort.id}`, 
      { isActive: newStatus }, 
      { headers }
    );
    
    console.log('✅ Update response:', updateResponse.data);
    
    // Verify the change
    const verifyResponse = await axios.get(`${baseURL}/admin/cohorts`, { headers });
    const updatedCohort = verifyResponse.data.cohorts.find(c => c.id === testCohort.id);
    
    console.log(`\n🔍 Verification:`);
    console.log(`   Expected: ${newStatus ? 'Active' : 'Inactive'}`);
    console.log(`   Actual:   ${updatedCohort.isActive ? 'Active' : 'Inactive'}`);
    
    if (updatedCohort.isActive === newStatus) {
      console.log('✅ Activate/Deactivate working correctly!');
    } else {
      console.log('❌ Activate/Deactivate not working - status unchanged');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testActivateDeactivate();
