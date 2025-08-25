-- PostgreSQL Script to Add Password Reset Fields to Users Table
-- Run this script in PgAdmin

-- Add the password reset columns to the existing users table
ALTER TABLE users ADD COLUMN "resetToken" TEXT;
ALTER TABLE users ADD COLUMN "resetTokenExpiry" TIMESTAMP;

-- Create an index on resetToken for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS "idx_users_reset_token" ON users("resetToken");

-- Verify the changes by checking the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('resetToken', 'resetTokenExpiry');

-- Optional: Show a sample of the updated table structure
SELECT 
    id, 
    email, 
    "fullName", 
    "resetToken", 
    "resetTokenExpiry" 
FROM users 
LIMIT 5;
