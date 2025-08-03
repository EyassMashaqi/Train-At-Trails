const axios = require('axios');

async function testLeaderboard() {
  try {
    // First, let's login to get a token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      identifier: 'user1',
      password: 'password'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Test leaderboard endpoint
    const leaderboardResponse = await axios.get('http://localhost:3000/api/game/leaderboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\n📊 Leaderboard API Response:');
    console.log('Status:', leaderboardResponse.status);
    console.log('Data:', JSON.stringify(leaderboardResponse.data, null, 2));
    
    const users = leaderboardResponse.data.users || leaderboardResponse.data.leaderboard || [];
    console.log(`\n👥 Number of users with progress: ${users.length}`);
    
    if (users.length === 0) {
      console.log('🚂 No users have made progress yet - this will show the empty state message');
    } else {
      console.log('🏆 Users on leaderboard:');
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.trainName || user.fullName} - Step ${user.currentStep}`);
      });
    }

  } catch (error) {
    console.error('❌ Error testing leaderboard:', error.response?.data || error.message);
  }
}

testLeaderboard();
