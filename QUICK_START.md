# Quick Start Guide - BVisionRY Lighthouse

## 🚀 Fast Setup (5 minutes)

### Prerequisites Check
```bash
node --version    # Should be 18.0.0 or higher
npm --version     # Should be 8.0.0 or higher
```

### Option 1: Automated Setup (Recommended)

#### Windows Users:
```cmd
# Run the setup script
setup.bat
```

#### Mac/Linux Users:
```bash
# Make script executable and run
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

```bash
# 1. Install all dependencies
npm run install:all

# 2. Setup environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Setup database
cd backend
npm run db:generate
npm run db:migrate
npm run db:seed
cd ..

# 4. Start development servers
npm run dev
```

## 🌐 Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Database**: PostgreSQL database at `localhost:5432`

## 🔑 Default Login Credentials

- **Admin User**: 
  - Email: `admin@trainattrails.com`
  - Password: `admin123`

## 📁 Key Files to Configure

### Backend (.env)
```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
JWT_SECRET="your-secret-key"
PORT=3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
```

## 🛠️ Available Commands

```bash
# Development
npm run dev              # Start both frontend & backend
npm run dev:frontend     # Start frontend only
npm run dev:backend      # Start backend only

# Building
npm run build           # Build both
npm run build:frontend  # Build frontend only
npm run build:backend   # Build backend only

# Database
cd backend
npm run db:migrate      # Run migrations
npm run db:generate     # Generate Prisma client
npm run db:seed         # Seed with sample data
```

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Kill processes using default ports
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Mac/Linux
lsof -ti:3000 | xargs kill
lsof -ti:5173 | xargs kill
```

### Database Issues
```bash
# Reset database
cd backend
# Reset database (if needed)
npx prisma db push --force-reset
npm run db:migrate
npm run db:seed
```

### Clean Install
```bash
# Remove all node_modules
rm -rf node_modules frontend/node_modules backend/node_modules
# Reinstall
npm run install:all
```

## 📖 Next Steps

1. **Read the full REQUIREMENTS.md** for detailed setup information
2. **Check the project structure** in the main README.md
3. **Start developing** by exploring the `frontend/src` and `backend/src` directories
4. **Configure your IDE** with the recommended VS Code extensions

## 💡 Tips

- Use `npm run dev` to start both servers simultaneously
- The frontend auto-reloads on file changes
- The backend restarts automatically with ts-node-dev
- Check browser console and terminal for error messages
- Database is PostgreSQL for production-ready deployment

## 🆘 Need Help?

- Check the detailed REQUIREMENTS.md file
- Look at the source code comments
- Review the Prisma schema for database structure
- Check the API routes in `backend/src/routes/`

Happy coding! 🎮🚂
