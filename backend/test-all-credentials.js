const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function testAllCredentials() {
  console.log('🔐 Testing all demo account credentials...\n');
  
  const testAccounts = [
    { email: 'admin@traintrails.com', password: 'admin123', role: 'Admin' },
    { email: 'alice@traintrails.com', password: 'password123', role: 'User' },
    { email: 'bob@traintrails.com', password: 'password123', role: 'User' },
    { email: 'test@traintrails.com', password: 'test123', role: 'User' }
  ];

  let allTestsPassed = true;

  for (const account of testAccounts) {
    try {
      console.log(`Testing ${account.role}: ${account.email}`);
      
      // Find user in database
      const user = await prisma.user.findUnique({
        where: { email: account.email }
      });

      if (!user) {
        console.log(`   ❌ User not found: ${account.email}`);
        allTestsPassed = false;
        continue;
      }

      // Test password
      const isValidPassword = await bcrypt.compare(account.password, user.password);
      
      if (isValidPassword) {
        console.log(`   ✅ Login successful: ${user.fullName}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Train: ${user.trainName}`);
        console.log(`      Role: ${user.isAdmin ? 'Administrator' : 'User'}`);
        console.log(`      Progress: Step ${user.currentStep}`);
      } else {
        console.log(`   ❌ Invalid password for: ${account.email}`);
        allTestsPassed = false;
      }
      
      console.log(''); // Empty line for spacing
      
    } catch (error) {
      console.log(`   ❌ Error testing ${account.email}:`, error.message);
      allTestsPassed = false;
    }
  }

  if (allTestsPassed) {
    console.log('🎉 All demo account credentials are working correctly!');
    console.log('\n📋 Demo Account Summary:');
    console.log('┌─────────────────────────────────────────────┐');
    console.log('│                DEMO ACCOUNTS                │');
    console.log('├─────────────────────────────────────────────┤');
    console.log('│ Admin: admin@traintrails.com / admin123     │');
    console.log('│ User:  alice@traintrails.com / password123  │');
    console.log('│ User:  bob@traintrails.com / password123    │');
    console.log('│ User:  test@traintrails.com / test123       │');
    console.log('└─────────────────────────────────────────────┘');
  } else {
    console.log('💥 Some credential tests failed. Please check the database.');
  }

  await prisma.$disconnect();
  return allTestsPassed;
}

// Run the test
testAllCredentials()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
