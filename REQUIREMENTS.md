# Train at Trails - Requirements & Setup Guide

## System Requirements

### Prerequisites
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Git**: For version control
- **VS Code**: Recommended IDE (optional)

### Operating System Support
- Windows 10/11
- macOS 10.15 or higher
- Linux (Ubuntu 20.04 LTS or equivalent)

## Project Dependencies

### Root Project
The main project uses npm workspaces to manage both frontend and backend dependencies.

```json
{
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### Backend Dependencies (Node.js + Express + TypeScript)

#### Production Dependencies
```json
{
  "@prisma/client": "^5.7.1",
  "bcryptjs": "^2.4.3", 
  "cors": "^2.8.5",
  "express": "^4.18.2",
  "jsonwebtoken": "^9.0.2",
  "node-cron": "^3.0.3",
  "dotenv": "^16.3.1",
  "helmet": "^7.1.0",
  "express-rate-limit": "^7.1.5"
}
```

#### Development Dependencies
```json
{
  "@types/bcryptjs": "^2.4.6",
  "@types/cors": "^2.8.17", 
  "@types/express": "^4.17.21",
  "@types/jsonwebtoken": "^9.0.5",
  "@types/node": "^20.10.5",
  "@types/node-cron": "^3.0.11",
  "prisma": "^5.7.1",
  "ts-node": "^10.9.2",
  "ts-node-dev": "^2.0.0",
  "typescript": "^5.3.3"
}
```

### Frontend Dependencies (React + TypeScript + Vite)

#### Production Dependencies
```json
{
  "@types/react-router-dom": "^5.3.3",
  "axios": "^1.11.0",
  "lucide-react": "^0.525.0",
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "react-hot-toast": "^2.5.2",
  "react-router-dom": "^7.7.0",
  "tailwindcss": "^3.4.17"
}
```

#### Development Dependencies
```json
{
  "@eslint/js": "^9.30.1",
  "@types/react": "^19.1.8",
  "@types/react-dom": "^19.1.6",
  "@vitejs/plugin-react": "^4.6.0",
  "autoprefixer": "^10.4.21",
  "eslint": "^9.30.1",
  "eslint-plugin-react-hooks": "^5.2.0",
  "eslint-plugin-react-refresh": "^0.4.20",
  "globals": "^16.3.0",
  "postcss": "^8.5.6",
  "typescript": "~5.8.3",
  "typescript-eslint": "^8.35.1",
  "vite": "^7.0.4"
}
```

## Database Requirements

### Database Engine
- **PostgreSQL**: Production database
- **PostgreSQL**: Recommended for production deployment

### ORM
- **Prisma ORM**: Version 5.7.1 or higher

## Installation Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Train-At-Trails
```

### 2. Install All Dependencies
```bash
# Install root dependencies and all workspace dependencies
npm run install:all
```

### 3. Environment Setup
Create environment files:

#### Backend Environment (`.env` in `/backend` folder)
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-here"

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Origins (comma-separated)
CORS_ORIGINS="http://localhost:5173"
```

#### Frontend Environment (`.env` in `/frontend` folder)
```env
# API Base URL
VITE_API_URL=http://localhost:3000/api
```

### 4. Database Setup
```bash
# Navigate to backend directory
cd backend

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database with initial data
npm run db:seed
```

### 5. Development Server
```bash
# From root directory - starts both frontend and backend
npm run dev

# Or start individually:
npm run dev:frontend  # Frontend only (http://localhost:5173)
npm run dev:backend   # Backend only (http://localhost:3000)
```

## Production Build

### Build All Components
```bash
npm run build
```

### Individual Builds
```bash
# Frontend build
npm run build:frontend

# Backend build  
npm run build:backend
```

## Troubleshooting

### Common Issues

1. **Node.js Version**: Ensure you're using Node.js 18+
   ```bash
   node --version
   ```

2. **Port Conflicts**: If default ports are in use, update the PORT environment variable

3. **Database Issues**: Delete `backend/prisma/dev.db` and re-run migrations if needed

4. **Dependencies**: Clear node_modules and reinstall if encountering version conflicts
   ```bash
   rm -rf node_modules frontend/node_modules backend/node_modules
   npm run install:all
   ```

### Performance Optimization
- Use `npm ci` instead of `npm install` in production for faster, reliable builds
- Enable production environment variables for optimized builds
- Consider using PM2 or similar process managers for production deployment

## Development Tools (Optional but Recommended)

### VS Code Extensions
- TypeScript and JavaScript Language Features
- Prisma (for database schema editing)
- Tailwind CSS IntelliSense
- ESLint
- Prettier

### Browser DevTools
- React Developer Tools
- Redux DevTools (if using Redux in the future)

## Security Considerations

### Environment Variables
- Never commit `.env` files to version control
- Use strong, unique JWT secrets in production
- Configure proper CORS origins for production

### Dependencies
- Regularly update dependencies for security patches
- Use `npm audit` to check for vulnerabilities
- Consider using tools like Snyk for continuous security monitoring

## License & Contributing
Please refer to the project's LICENSE file and contribution guidelines before making changes.
