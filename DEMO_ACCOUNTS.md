# Demo Accounts Documentation

This document contains the official demo account credentials for the Train at Trails application.

## Demo Account Credentials

### Admin Account
- **Email:** `admin@traintrails.com`
- **Password:** `admin123`
- **Role:** Administrator
- **Access:** Full admin dashboard, user management, question/module management

### User Accounts

#### Alice Johnson
- **Email:** `alice@traintrails.com`
- **Password:** `password123`
- **Train Name:** Lightning Express
- **Progress:** Step 2
- **Status:** Regular User

#### Bob Smith
- **Email:** `bob@traintrails.com`
- **Password:** `password123`
- **Train Name:** Thunder Rail
- **Progress:** Step 1
- **Status:** Regular User

#### Test User
- **Email:** `test@traintrails.com`
- **Password:** `test123`
- **Train Name:** Test Express
- **Progress:** Step 0
- **Status:** Regular User

## Database Management Scripts

### Update Demo Accounts
To update all demo accounts with the correct credentials:
```bash
node update-demo-accounts.js
```

### Full Database Seed with Demo Accounts
To completely reseed the database with demo accounts and sample data:
```bash
node seed-demo-accounts.js
```

### Create Admin Only
To create or update just the admin account:
```bash
node create-admin.js
```

### Restore Basic Data
To restore basic data structure with demo accounts:
```bash
node restore-data.js
```

### Verify Database
To check the current database state:
```bash
node check-data.js
```

### Test Login
To test login functionality:
```bash
node test-login.js
```

## Migration Files Updated

The following files have been updated to use the correct demo account credentials:

1. **`update-demo-accounts.js`** - Comprehensive script to update all demo accounts
2. **`seed-demo-accounts.js`** - Complete database seeding with demo accounts
3. **`restore-data.js`** - Updated to use correct demo credentials
4. **`create-admin.js`** - Updated admin email and credentials display

## Security Notes

- All passwords are properly hashed using bcrypt
- Demo credentials are for development/testing purposes only
- In production, use secure passwords and proper authentication flows

## Usage Examples

### Admin Login
1. Navigate to the login page
2. Enter: `admin@traintrails.com` / `admin123`
3. Access admin dashboard for complete system management

### User Login (Alice - Advanced User)
1. Navigate to the login page
2. Enter: `alice@traintrails.com` / `password123`  
3. View user dashboard with progress at Step 2

### User Login (Bob - Beginner User)
1. Navigate to the login page
2. Enter: `bob@traintrails.com` / `password123`
3. View user dashboard with progress at Step 1

### User Login (Test User - New User)
1. Navigate to the login page
2. Enter: `test@traintrails.com` / `test123`
3. View user dashboard at Step 0 (starting position)

## Database State After Update

After running the demo account update scripts, the database will contain:

- **4 Users:** 1 admin + 3 regular users
- **3 Modules:** Leadership Foundation, Team Leadership & Communication, Strategic Leadership & Innovation
- **12 Questions:** 4 questions per module
- **Sample Mini Questions:** For the first 3 questions
- **Sample Content:** Learning materials and interactive exercises
- **Clean State:** No existing answers or progress (fresh start)

## Troubleshooting

### If login fails:
1. Verify the database contains the correct users: `node check-data.js`
2. Re-run the update script: `node update-demo-accounts.js`
3. Test login functionality: `node test-login.js`

### If database is empty:
1. Run the comprehensive seed: `node seed-demo-accounts.js`
2. Or run basic restore: `node restore-data.js`

### Password issues:
All passwords are hashed with bcrypt. If you need to manually verify:
- Use the `test-login.js` script to verify password hashing is working correctly

---

**Last Updated:** July 31, 2025  
**Version:** 1.0  
**Status:** Active Demo Credentials
