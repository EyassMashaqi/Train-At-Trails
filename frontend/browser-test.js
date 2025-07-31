// Simple test with console output to check the API structure
fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'alice@traintrails.com', password: 'password123' })
})
.then(res => res.json())
.then(loginData => {
  console.log('Login response:', loginData);
  return fetch('http://localhost:3000/game/progress', {
    headers: { 'Authorization': `Bearer ${loginData.access_token}` }
  });
})
.then(res => res.json())
.then(progressData => {
  console.log('Progress data structure:');
  console.log('- user:', progressData.user ? 'exists' : 'missing');
  console.log('- questions:', Array.isArray(progressData.questions) ? `array(${progressData.questions.length})` : 'missing/invalid');
  console.log('- currentStep:', progressData.currentStep);
  console.log('- totalSteps:', progressData.totalSteps);
  
  if (progressData.questions && progressData.questions.length > 0) {
    const q = progressData.questions[0];
    console.log('First question:');
    console.log('  - id:', q.id);
    console.log('  - title:', q.title);
    console.log('  - status:', q.status);
    console.log('  - miniQuestionProgress:', q.miniQuestionProgress);
  }
})
.catch(err => console.error('Error:', err));
