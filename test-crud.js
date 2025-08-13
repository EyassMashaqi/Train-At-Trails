// Test all CRUD operations for cohorts
const axios = require('axios');

async function testAllOperations() {
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
    
    // Test 1: List cohorts
    console.log('\n📋 Test 1: List cohorts');
    const listResponse = await axios.get(`${baseURL}/admin/cohorts`, { headers });
    console.log(`   Found ${listResponse.data.cohorts.length} cohorts`);
    
    // Test 2: Create a test cohort
    console.log('\n➕ Test 2: Create cohort');
    const createPayload = {
      name: 'Test Cohort for CRUD',
      cohortNumber: 9999,
      description: 'This is a test cohort for testing CRUD operations',
      startDate: '2025-08-13',
      endDate: '2025-12-31'
    };
    
    const createResponse = await axios.post(`${baseURL}/admin/cohorts`, createPayload, { headers });
    const testCohortId = createResponse.data.cohort.id;
    console.log(`   Created cohort: ${testCohortId}`);
    
    // Test 3: Update cohort (activate/deactivate)
    console.log('\n🔄 Test 3: Activate cohort');
    const updateResponse = await axios.patch(
      `${baseURL}/admin/cohorts/${testCohortId}`, 
      { isActive: true }, 
      { headers }
    );
    console.log(`   Updated status: ${updateResponse.data.cohort.isActive ? 'Active' : 'Inactive'}`);
    
    // Test 4: Copy cohort
    console.log('\n📋 Test 4: Copy cohort');
    const copyResponse = await axios.post(
      `${baseURL}/admin/cohorts/${testCohortId}/copy`,
      { newName: 'Test Cohort Copy', newCohortNumber: 9998 },
      { headers }
    );
    const copiedCohortId = copyResponse.data.cohort.id;
    console.log(`   Copied cohort: ${copiedCohortId}`);
    
    // Test 5: Delete copied cohort
    console.log('\n🗑️ Test 5: Delete copied cohort');
    const deleteResponse = await axios.delete(`${baseURL}/admin/cohorts/${copiedCohortId}`, { headers });
    console.log(`   Deleted: ${deleteResponse.data.deletedCohort.name}`);
    
    // Test 6: Delete original test cohort
    console.log('\n🗑️ Test 6: Delete original test cohort');
    const deleteResponse2 = await axios.delete(`${baseURL}/admin/cohorts/${testCohortId}`, { headers });
    console.log(`   Deleted: ${deleteResponse2.data.deletedCohort.name}`);
    
    console.log('\n🎉 All CRUD operations successful!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Stack:', error.stack);
  }
}

testAllOperations();
