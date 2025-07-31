const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function updateDemoAccounts() {
  try {
    console.log('🔄 Updating demo accounts to match specifications...');

    // Demo accounts specification
    const demoAccounts = [
      {
        email: 'admin@traintrails.com',
        password: 'admin123',
        fullName: 'System Administrator',
        trainName: 'Admin Express',
        isAdmin: true,
        currentStep: 0
      },
      {
        email: 'alice@traintrails.com',
        password: 'password123',
        fullName: 'Alice Johnson',
        trainName: 'Lightning Express',
        isAdmin: false,
        currentStep: 2
      },
      {
        email: 'bob@traintrails.com',
        password: 'password123',
        fullName: 'Bob Smith',
        trainName: 'Thunder Rail',
        isAdmin: false,
        currentStep: 1
      },
      {
        email: 'test@traintrails.com',
        password: 'test123',
        fullName: 'Test User',
        trainName: 'Test Express',
        isAdmin: false,
        currentStep: 0
      }
    ];

    // Delete all existing users first to avoid conflicts
    console.log('🗑️  Removing existing users...');
    await prisma.user.deleteMany({});

    // Create new demo accounts
    for (const account of demoAccounts) {
      console.log(`👤 Creating user: ${account.fullName} (${account.email})`);
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(account.password, 10);
      
      const user = await prisma.user.create({
        data: {
          email: account.email,
          password: hashedPassword,
          fullName: account.fullName,
          trainName: account.trainName,
          isAdmin: account.isAdmin,
          currentStep: account.currentStep
        }
      });

      console.log(`   ✅ Created: ${user.fullName} - ${user.email}`);
    }

    console.log('\n🎉 Demo accounts updated successfully!');
    console.log('\n📋 Demo Account Credentials:');
    console.log('┌─────────────────────────────────────────────┐');
    console.log('│                DEMO ACCOUNTS                │');
    console.log('├─────────────────────────────────────────────┤');
    console.log('│ Admin: admin@traintrails.com / admin123     │');
    console.log('│ User:  alice@traintrails.com / password123  │');
    console.log('│ User:  bob@traintrails.com / password123    │');
    console.log('│ User:  test@traintrails.com / test123       │');
    console.log('└─────────────────────────────────────────────┘');

    // Verify the accounts
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        trainName: true,
        isAdmin: true,
        currentStep: true
      },
      orderBy: [
        { isAdmin: 'desc' },
        { email: 'asc' }
      ]
    });

    console.log('\n✅ Verification - Created Users:');
    users.forEach(user => {
      const role = user.isAdmin ? 'ADMIN' : 'USER';
      console.log(`   ${role}: ${user.fullName} (${user.email}) - Step: ${user.currentStep}`);
    });

  } catch (error) {
    console.error('❌ Error updating demo accounts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateDemoAccounts()
  .then(() => {
    console.log('\n🏁 Demo account update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
