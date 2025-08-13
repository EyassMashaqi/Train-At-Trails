// Test copy functionality and check what data might be missing
const axios = require('axios');

async function testCopyAndCheck() {
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
    
    // Get original cohort with full details
    const cohortsResponse = await axios.get(`${baseURL}/admin/cohorts`, { headers });
    const originalCohort = cohortsResponse.data.cohorts.find(c => c.name === 'test1111');
    
    if (!originalCohort) {
      console.log('❌ Original cohort "test1111" not found');
      return;
    }
    
    console.log('📊 Original cohort data:');
    console.log('  ID:', originalCohort.id);
    console.log('  Name:', originalCohort.name);
    console.log('  Number:', originalCohort.cohortNumber);
    console.log('  Counts:', originalCohort._count);
    
    // Create a new copy with unique name/number
    const uniqueNumber = Math.floor(Math.random() * 1000) + 100;
    const copyPayload = {
      newName: `Test Copy ${uniqueNumber}`,
      newCohortNumber: uniqueNumber
    };
    
    console.log('\n🔄 Creating copy...');
    const copyResponse = await axios.post(
      `${baseURL}/admin/cohorts/${originalCohort.id}/copy`, 
      copyPayload, 
      { headers }
    );
    
    console.log('✅ Copy created successfully!');
    console.log('📊 Copied cohort data:');
    console.log('  ID:', copyResponse.data.cohort.id);
    console.log('  Name:', copyResponse.data.cohort.name);
    console.log('  Number:', copyResponse.data.cohort.cohortNumber);
    console.log('  Counts:', copyResponse.data.cohort._count);
    
    // Now get the detailed copied cohort data
    const copiedCohortsResponse = await axios.get(`${baseURL}/admin/cohorts`, { headers });
    const copiedCohort = copiedCohortsResponse.data.cohorts.find(c => c.id === copyResponse.data.cohort.id);
    
    console.log('\n🔍 Detailed comparison:');
    console.log('Original modules:', originalCohort._count?.modules || 0);
    console.log('Copied modules:  ', copiedCohort._count?.modules || 0);
    console.log('Original questions:', originalCohort._count?.questions || 0);
    console.log('Copied questions:  ', copiedCohort._count?.questions || 0);
    console.log('Original members:', originalCohort._count?.cohortMembers || 0);
    console.log('Copied members:   ', copiedCohort._count?.cohortMembers || 0);
    
    // Check if there's any obvious missing data
    const issues = [];
    if ((originalCohort._count?.modules || 0) !== (copiedCohort._count?.modules || 0)) {
      issues.push(`Module count mismatch: ${originalCohort._count?.modules || 0} vs ${copiedCohort._count?.modules || 0}`);
    }
    if ((originalCohort._count?.questions || 0) !== (copiedCohort._count?.questions || 0)) {
      issues.push(`Question count mismatch: ${originalCohort._count?.questions || 0} vs ${copiedCohort._count?.questions || 0}`);
    }
    
    if (issues.length > 0) {
      console.log('\n❌ Issues found:');
      issues.forEach(issue => console.log('  -', issue));
    } else {
      console.log('\n✅ All counts match! Copy appears successful.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testCopyAndCheck();
