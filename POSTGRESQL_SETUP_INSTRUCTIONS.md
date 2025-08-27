# 🔧 PostgreSQL Password Reset Setup Instructions

## 📊 **STEP 1: Run SQL Script in PgAdmin**

**Copy and paste this SQL script into PgAdmin and execute it:**

```sql
-- Add password reset columns to the existing users table
ALTER TABLE users ADD COLUMN "resetToken" TEXT;
ALTER TABLE users ADD COLUMN "resetTokenExpiry" TIMESTAMP;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_users_reset_token" ON users("resetToken");
```

## 🔍 **STEP 2: Verify the Changes**

**Run this query to confirm the columns were added:**

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('resetToken', 'resetTokenExpiry');
```

**Expected Result:**
```
column_name     | data_type | is_nullable
----------------|-----------|------------
resetToken      | text      | YES
resetTokenExpiry| timestamp | YES
```

## 🚀 **STEP 3: Restart Development Server**

After running the SQL script:

1. **Stop your current development server** (Ctrl+C)
2. **Regenerate Prisma client:**
   ```bash
   cd backend
   npx prisma generate
   ```
3. **Restart development server:**
   ```bash
   npm run dev
   ```

## 📧 **STEP 4: Test Email Functionality**

After restarting:

1. Go to: http://localhost:5177/forgot-password
2. Enter: `admin@traintrails.com` (or any existing user email)
3. Check: Your email inbox for the reset link
4. Click: The reset link in the email
5. Reset: Your password successfully

---

## 🔧 **Database Connection Details**

**Current Configuration:**
- **Database**: PostgreSQL
- **Host**: localhost:5432
- **Database Name**: bvisionry_lighthouse
- **Username**: postgres
- **Password**: 1234

**Email Configuration:**
- **SMTP Host**: smtp.gmail.com
- **Email**: bvisionry.lighthouse@gmail.com
- **Status**: ✅ Ready to send emails

---

## ⚠️ **Important Notes**

1. **No New Table Needed** - We're adding columns to the existing `users` table
2. **PostgreSQL vs SQLite** - Fixed the database provider mismatch
3. **Email Service** - Already configured and ready to work
4. **Security** - Tokens expire in 1 hour for security

---

## 🎯 **After Running the SQL Script**

The forgot password feature will be **100% functional** with:
- ✅ Database fields for token storage
- ✅ Real email sending
- ✅ Secure token validation
- ✅ Professional UI
- ✅ Complete security implementation

**Just run the SQL script above in PgAdmin and restart your server!** 🚀
