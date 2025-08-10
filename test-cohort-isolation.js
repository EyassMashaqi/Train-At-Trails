const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testCohortIsolation() {
    console.log('🧪 Testing Cohort Isolation...\n');
    
    // Test data
    const adminCredentials = {
        email: 'admin@traintrails.com',
        password: 'admin123'
    };
    
    try {
        // 1. Login as admin
        console.log('1. Logging in as admin...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, adminCredentials);
        const token = loginResponse.data.token;
        console.log('✅ Admin login successful\n');
        
        const headers = { Authorization: `Bearer ${token}` };
        
        // 2. Get all cohorts
        console.log('2. Getting all cohorts...');
        const cohortsResponse = await axios.get(`${API_BASE}/admin/cohorts`, { headers });
        const cohorts = cohortsResponse.data.cohorts || [];
        console.log(`✅ Found ${cohorts.length} cohorts:`);
        cohorts.forEach(cohort => {
            console.log(`   - ${cohort.name} (ID: ${cohort.id})`);
        });
        console.log('');
        
        if (cohorts.length < 2) {
            console.log('⚠️  Need at least 2 cohorts to test isolation. Skipping isolation test.');
            return;
        }
        
        // 3. Test pending answers without cohort filter
        console.log('3. Getting pending answers (all cohorts)...');
        const allPendingResponse = await axios.get(`${API_BASE}/admin/pending-answers`, { headers });
        const allPendingAnswers = allPendingResponse.data.pendingAnswers || [];
        console.log(`✅ Found ${allPendingAnswers.length} total pending answers\n`);
        
        // 4. Test pending answers with cohort filters
        for (const cohort of cohorts.slice(0, 2)) { // Test first 2 cohorts
            console.log(`4.${cohort.id} Getting pending answers for cohort: ${cohort.name}...`);
            const cohortPendingResponse = await axios.get(
                `${API_BASE}/admin/pending-answers?cohortId=${cohort.id}`, 
                { headers }
            );
            const cohortPendingAnswers = cohortPendingResponse.data.pendingAnswers || [];
            console.log(`✅ Found ${cohortPendingAnswers.length} pending answers for ${cohort.name}`);
            
            // Verify all answers belong to this cohort
            const wrongCohortAnswers = cohortPendingAnswers.filter(answer => 
                answer.cohortId && answer.cohortId !== cohort.id
            );
            
            if (wrongCohortAnswers.length > 0) {
                console.log(`❌ ERROR: Found ${wrongCohortAnswers.length} answers from wrong cohorts!`);
                wrongCohortAnswers.forEach(answer => {
                    console.log(`   - Answer ${answer.id} belongs to cohort ${answer.cohortId}, not ${cohort.id}`);
                });
            } else {
                console.log(`✅ All answers correctly isolated to cohort ${cohort.id}`);
            }
        }
        console.log('');
        
        // 5. Test game stats without cohort filter
        console.log('5. Getting game stats (all cohorts)...');
        const allStatsResponse = await axios.get(`${API_BASE}/admin/stats`, { headers });
        const allStats = allStatsResponse.data;
        console.log(`✅ All cohorts stats:`, {
            totalUsers: allStats.totalUsers,
            totalAnswers: allStats.totalAnswers,
            pendingAnswers: allStats.pendingAnswers
        });
        console.log('');
        
        // 6. Test game stats with cohort filters
        for (const cohort of cohorts.slice(0, 2)) { // Test first 2 cohorts
            console.log(`6.${cohort.id} Getting stats for cohort: ${cohort.name}...`);
            const cohortStatsResponse = await axios.get(
                `${API_BASE}/admin/stats?cohortId=${cohort.id}`, 
                { headers }
            );
            const cohortStats = cohortStatsResponse.data;
            console.log(`✅ Cohort ${cohort.name} stats:`, {
                totalUsers: cohortStats.totalUsers,
                totalAnswers: cohortStats.totalAnswers,
                pendingAnswers: cohortStats.pendingAnswers
            });
        }
        
        console.log('\n🎉 Cohort isolation test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testCohortIsolation();
