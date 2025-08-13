// Test script for cohort copy functionality
const axios = require('axios');

const baseURL = 'http://localhost:3000/api';

async function testCohortCopy() {
  try {
    console.log('🧪 Testing Cohort Copy Functionality');
    
    // First, login as admin to get token
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@traintrails.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Logged in successfully');
    
    // Get existing cohorts
    const cohortsResponse = await axios.get(`${baseURL}/admin/cohorts`, { headers });
    const cohorts = cohortsResponse.data.cohorts;
    
    console.log(`📊 Found ${cohorts.length} existing cohorts:`);
    cohorts.forEach(cohort => {
      console.log(`  - #${cohort.cohortNumber} ${cohort.name} (ID: ${cohort.id})`);
    });
    
    if (cohorts.length === 0) {
      console.log('❌ No cohorts found to copy');
      return;
    }
    
    // Test copying the first cohort
    const sourceCohort = cohorts[0];
    console.log(`\n🔄 Attempting to copy cohort: #${sourceCohort.cohortNumber} ${sourceCohort.name}`);
    
    const copyPayload = {
      newName: `${sourceCohort.name} (Test Copy)`,
      newCohortNumber: 999 // Use a high number to avoid conflicts
    };
    
    const copyResponse = await axios.post(
      `${baseURL}/admin/cohorts/${sourceCohort.id}/copy`, 
      copyPayload, 
      { headers }
    );
    
    console.log('✅ Cohort copied successfully!');
    console.log('📋 Copy result:', {
      id: copyResponse.data.cohort.id,
      name: copyResponse.data.cohort.name,
      cohortNumber: copyResponse.data.cohort.cohortNumber,
      counts: copyResponse.data.cohort._count
    });
    
    // Test validation - try to create duplicate
    console.log('\n🧪 Testing duplicate prevention...');
    try {
      await axios.post(
        `${baseURL}/admin/cohorts/${sourceCohort.id}/copy`, 
        copyPayload, 
        { headers }
      );
      console.log('❌ Validation failed - duplicate was allowed');
    } catch (error) {
      console.log('✅ Validation working - duplicate prevented:', error.response.data.message);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testCohortCopy();
