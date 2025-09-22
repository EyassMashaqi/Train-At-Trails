# 🚂 BVisionRY Lighthouse

A gamified web application where users progress through a 12-step trail by answering questions that are released every 2 days. Each answer requires admin approval before the user's train moves forward.

## 🎯 Game Concept

- **User Registration**: Users create accounts with personal train names
- **Progressive Questions**: 12 questions released every 48 hours  
- **Admin Review**: All answers require admin approval before progress
- **Train Animation**: Visual train progression on a 12-step trail
- **Completion**: Users reaching step 12 achieve success

## 🏗️ Project Structure

```
train-at-trails/
├── backend/                 # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── routes/         # API routes (auth, game, admin)
│   │   ├── middleware/     # Authentication & authorization
│   │   ├── services/       # Business logic & schedulers
│   │   └── prisma/         # Database schema & migrations
│   ├── .env                # Environment variables
│   └── package.json
├── frontend/               # React + TypeScript + TailwindCSS
│   ├── src/
│   │   ├── pages/          # React pages/components
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Auth, etc.)
│   │   └── services/       # API service layer
│   └── package.json
└── package.json           # Root package with scripts
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **TailwindCSS** for styling
- **React Router** for navigation
- **Axios** for API calls
- **React Hot Toast** for notifications
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Prisma ORM** with PostgreSQL
- **JWT** authentication
- **bcryptjs** for password hashing
- **node-cron** for question scheduling

### Database
- **PostgreSQL** for production
- **Prisma** for database management

## 🚀 Quick Start

> **📋 For detailed setup instructions, see [REQUIREMENTS.md](./REQUIREMENTS.md)**
> 
> **⚡ For fastest setup, see [QUICK_START.md](./QUICK_START.md)**

### Automated Setup (Recommended)
```bash
# Windows users
setup.bat

# Mac/Linux users
chmod +x setup.sh && ./setup.sh
```

### Manual Setup

#### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

#### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Database Setup
1. Create a PostgreSQL database
2. Copy `backend/.env.example` to `backend/.env`
3. Update the `DATABASE_URL` in `.env`
4. Run database migrations:
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 3. Seed Database
```bash
cd backend
npm run db:seed
```

### 4. Start Development Servers
```bash
# From root directory - starts both frontend and backend
npm run dev

# Or start individually:
npm run dev:frontend  # Starts React dev server (port 5173)
npm run dev:backend   # Starts Express server (port 3000)
```

## 📝 Demo Accounts

After running the setup, you can use these demo accounts:

**Admin Account:**
- Email: `admin@traintrails.com`
- Password: `admin123`
- Access: Full admin dashboard and system management

**Test Users:**
- Email: `alice@traintrails.com` / Password: `password123` (Progress: Step 2)
- Email: `bob@traintrails.com` / Password: `password123` (Progress: Step 1)  
- Email: `test@traintrails.com` / Password: `test123` (Progress: Step 0)

> 📋 For detailed demo account information, see [DEMO_ACCOUNTS.md](./DEMO_ACCOUNTS.md)

## 🎮 Game Features

### User Features
- ✅ User registration and authentication
- ✅ Personal train with custom name
- ✅ 12-step trail visualization
- ✅ Question answering system
- ✅ Progress tracking
- ✅ Answer status monitoring
- ✅ Success celebration on completion

### Admin Features
- ✅ User management and progress overview
- ✅ Answer review and approval system
- ✅ Question management (create, edit, activate)
- ✅ Manual question release
- ✅ Game statistics dashboard
- ✅ Bulk user actions

### System Features
- ✅ Automated question release (every 48 hours)
- ✅ JWT authentication with session management
- ✅ Rate limiting and security headers
- ✅ Responsive design for all devices
- ✅ Real-time notifications
- ✅ Progress animations

## 🏃‍♂️ Development Scripts

```bash
# Root level commands
npm run dev                 # Start both frontend and backend
npm run build              # Build both projects
npm run install:all        # Install all dependencies

# Backend specific
cd backend
npm run dev                # Start backend development server
npm run build              # Build backend for production
npm run start              # Start production server
npm run db:migrate         # Run database migrations
npm run db:generate        # Generate Prisma client
npm run db:seed            # Seed database with initial data

# Frontend specific  
cd frontend
npm run dev                # Start frontend development server
npm run build              # Build frontend for production
npm run preview            # Preview production build
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/train_at_trails"

# JWT
JWT_SECRET="your-super-secure-jwt-secret-key"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"

# Admin Account
ADMIN_EMAIL="admin@trainattrails.com"
ADMIN_PASSWORD="admin123"

# Game Settings
QUESTION_RELEASE_INTERVAL_HOURS=48
```

### Frontend Configuration

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:3000/api
```

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set build command: `cd frontend && npm run build`
3. Set output directory: `frontend/dist`
4. Add environment variable: `VITE_API_URL`

### Backend (Railway/Render/Heroku)
1. Connect your GitHub repository
2. Set build command: `cd backend && npm run build`
3. Set start command: `cd backend && npm start`
4. Add all environment variables from `.env`
5. Add PostgreSQL database addon

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Game Endpoints
- `GET /api/game/status` - Get user's game progress
- `POST /api/game/answer` - Submit answer to question
- `GET /api/game/leaderboard` - Get leaderboard
- `GET /api/game/next-question` - Get next question release time

### Admin Endpoints
- `GET /api/admin/users` - Get all users and progress
- `GET /api/admin/pending-answers` - Get pending answers
- `PUT /api/admin/answer/:id/review` - Approve/reject answer
- `GET /api/admin/questions` - Get all questions
- `POST /api/admin/questions` - Create new question
- `PUT /api/admin/questions/:id` - Update question
- `POST /api/admin/questions/:id/activate` - Activate question
- `GET /api/admin/stats` - Get game statistics

## 🎨 UI Components

The frontend includes:
- **TrailVisualization**: 12-step progress display with train animation
- **QuestionCard**: Interactive question display and answer submission
- **AdminDashboard**: Comprehensive admin control panel
- **UserProgress**: Individual progress tracking
- **Leaderboard**: Community progress overview
- **AuthForms**: Login and registration with validation

## 🔒 Security Features

- JWT token-based authentication
- Password hashing with bcryptjs
- Rate limiting on API endpoints
- CORS configuration
- Input validation and sanitization
- SQL injection prevention via Prisma
- XSS protection with security headers

## 🌟 Future Enhancements

- 📧 Email notifications for new questions
- 🔊 Sound effects for train movements
- 🎨 Train customization options
- 👥 User avatars and profiles
- 📊 Advanced analytics dashboard
- 🏆 Achievement system
- 💬 Community chat features
- 📱 Mobile app version

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support or questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

**🚂 All aboard the BVisionRY Lighthouse! Let's make learning an adventure! 🎯**
