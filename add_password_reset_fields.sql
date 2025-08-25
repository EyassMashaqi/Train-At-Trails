-- SQL Script to Add Password Reset Fields to Users Table
-- Run this script directly on your SQLite database

-- Add the new columns for password reset functionality
ALTER TABLE users ADD COLUMN resetToken TEXT;
ALTER TABLE users ADD COLUMN resetTokenExpiry DATETIME;

-- Create an index on resetToken for faster lookups
CREATE INDEX idx_users_reset_token ON users(resetToken);

-- Verify the changes
.schema users

-- Show sample of updated table structure
SELECT sql FROM sqlite_master WHERE type='table' AND name='users';

-- Optional: Show current users to verify
SELECT id, email, fullName, resetToken, resetTokenExpiry FROM users LIMIT 5;
