// Node.js script to add password reset fields to the database
// Run this with: node add_password_reset_fields.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to your SQLite database
const dbPath = path.join(__dirname, 'backend', 'prisma', 'dev.db');

console.log('🔧 Adding password reset fields to users table...');
console.log('📍 Database path:', dbPath);

// Open database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to SQLite database');
});

// Function to run SQL commands
function runSQL(sql, description) {
  return new Promise((resolve, reject) => {
    db.run(sql, function(err) {
      if (err) {
        console.error(`❌ Error ${description}:`, err.message);
        reject(err);
      } else {
        console.log(`✅ ${description} completed successfully`);
        resolve();
      }
    });
  });
}

// Function to check table schema
function checkSchema() {
  return new Promise((resolve, reject) => {
    db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
      if (err) {
        console.error('❌ Error checking schema:', err.message);
        reject(err);
      } else {
        console.log('📋 Current users table schema:');
        console.log(row.sql);
        resolve();
      }
    });
  });
}

// Main execution
async function addPasswordResetFields() {
  try {
    console.log('\n🔍 Checking current table schema...');
    await checkSchema();

    console.log('\n🔧 Adding resetToken column...');
    await runSQL('ALTER TABLE users ADD COLUMN resetToken TEXT', 'adding resetToken column');

    console.log('🔧 Adding resetTokenExpiry column...');
    await runSQL('ALTER TABLE users ADD COLUMN resetTokenExpiry DATETIME', 'adding resetTokenExpiry column');

    console.log('🔧 Creating index on resetToken...');
    await runSQL('CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(resetToken)', 'creating resetToken index');

    console.log('\n🔍 Checking updated table schema...');
    await checkSchema();

    console.log('\n✨ Password reset fields added successfully!');
    console.log('🚀 You can now restart your development server and the forgot password feature will work.');

  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️  Fields already exist in the database - no changes needed!');
    } else {
      console.error('❌ Failed to add password reset fields:', error);
    }
  } finally {
    // Close database connection
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('🔒 Database connection closed');
      }
    });
  }
}

// Run the script
addPasswordResetFields();
