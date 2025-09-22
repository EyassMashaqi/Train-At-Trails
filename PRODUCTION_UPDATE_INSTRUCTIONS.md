# 🚀 Production Update Instructions

## ⚠️ CRITICAL: SAFE DATABASE UPDATE

This update adds email template functionality **WITHOUT DELETING ANY EXISTING DATA**.

## 📋 What This Update Adds

- ✅ **EmailType enum** - 8 email types for notifications
- ✅ **global_email_templates table** - System-wide email templates
- ✅ **cohort_email_configs table** - Cohort-specific email customization
- ✅ **AWAITING_RESUBMISSION status** - New status for approved resubmissions
- ✅ **Email templates** - 8 pre-built professional email templates

## 🔧 Server Update Steps

### 1. **Pull Latest Code**
```bash
git pull origin email-setup
```

### 2. **Install Dependencies** (if needed)
```bash
cd backend
npm install
cd ../frontend
npm install
```

### 3. **Run Database Migration** (SAFE - Won't Delete Data)
```bash
cd backend
npx prisma migrate deploy
```

### 4. **Regenerate Prisma Client**
```bash
npx prisma generate
```

### 5. **Restart Services**
```bash
# Using PM2 (recommended)
pm2 restart all

# Or restart your process manager
systemctl restart your-app-service
```

## 🛡️ Safety Features

The migration file uses:
- ✅ `CREATE TABLE IF NOT EXISTS` - Won't break if tables exist
- ✅ `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object` - Safe constraint creation
- ✅ `CREATE INDEX IF NOT EXISTS` - Safe index creation  
- ✅ `WHERE NOT EXISTS` - Only inserts new email templates

## 📊 Verification Commands

After deployment, verify everything works:

```bash
# Check database structure
npx prisma db pull

# Verify email templates exist
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() {
  const templates = await prisma.globalEmailTemplate.count();
  console.log('Email templates:', templates);
  await prisma.\$disconnect();
}
check();
"
```

## 🚨 What NOT to Run

**DO NOT RUN:**
- ❌ `npx prisma migrate reset` (WILL DELETE ALL DATA)
- ❌ `npx prisma db push --force-reset` (WILL DELETE ALL DATA)
- ❌ `npx prisma migrate dev` (Can cause issues in production)

## 📂 Files Changed

### Core Changes:
- `backend/prisma/schema.prisma` - Added email models
- `backend/src/routes/admin.ts` - Added AWAITING_RESUBMISSION status
- `frontend/src/pages/GameView.tsx` - Updated status display

### Migration:
- `backend/prisma/migrations/20250921134114_add_email_setup_tables/migration.sql`

## 🔍 Rollback Plan (if needed)

If something goes wrong, you can rollback the database:

```sql
-- Connect to PostgreSQL and run:
DROP TABLE IF EXISTS "cohort_email_configs";
DROP TABLE IF EXISTS "global_email_templates";  
DROP TYPE IF EXISTS "EmailType";
```

## ✅ Success Indicators

After update, you should see:
- ✅ Application starts without errors
- ✅ Users can login and see their questions
- ✅ Admin panel loads correctly
- ✅ 8 email templates in global_email_templates table
- ✅ No data loss - all users, questions, and answers preserved

## 📞 Support

If you encounter any issues:
1. Check application logs for errors
2. Verify database connection
3. Ensure all dependencies are installed
4. Contact support with specific error messages

---

**REMEMBER: This migration is designed to be 100% safe and preserve all existing data.**