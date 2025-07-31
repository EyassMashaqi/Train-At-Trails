const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('Creating admin user...');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { isAdmin: true }
    });

    if (existingAdmin) {
      console.log('Admin user already exists. Updating password...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Update admin password
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          password: hashedPassword
        }
      });
      
      console.log('✅ Admin password updated successfully!');
      console.log('Email:', existingAdmin.email);
      console.log('Password: admin123');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@traintrails.com',
        password: hashedPassword,
        fullName: 'System Administrator',
        trainName: 'Admin Express',
        isAdmin: true,
        currentStep: 0
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@traintrails.com');
    console.log('Password: admin123');
    console.log('Email: admin@trainattrails.com');
    console.log('Password: admin123');
    console.log('You can now log in to the admin dashboard.');

  } catch (error) {
    console.error('Failed to create admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
