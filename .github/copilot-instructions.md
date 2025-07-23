<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Train at Trails - Project Instructions for GitHub Copilot

## Project Overview
This is a full-stack gamification web application called "Train at Trails" where users progress through a 12-step trail by answering questions that are released every 2 days. Each answer requires admin approval before the user's train moves forward.

## Tech Stack
- **Frontend**: React 18 + TypeScript + TailwindCSS + Vite
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT tokens
- **Styling**: TailwindCSS with custom train/trail animations

## Project Structure
```
├── backend/                 # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── routes/         # API routes (auth, game, admin)
│   │   ├── middleware/     # Authentication & authorization
│   │   ├── services/       # Business logic & schedulers
│   │   └── prisma/         # Database schema & migrations
└── frontend/               # React + TypeScript + TailwindCSS
    ├── src/
    │   ├── pages/          # React pages/components
    │   ├── components/     # Reusable UI components
    │   ├── contexts/       # React contexts (Auth, etc.)
    └── services/           # API service layer
```

## Code Style Guidelines
- Use TypeScript for all files
- Follow React functional components with hooks
- Use TailwindCSS for all styling (no CSS modules or styled-components)
- Implement proper error handling with try-catch blocks
- Use Prisma ORM for all database operations
- Follow RESTful API conventions
- Use React Context for state management
- Implement proper TypeScript interfaces and types

## Database Schema
Key models:
- `User`: User accounts with train names and progress tracking
- `Question`: 12 questions with release scheduling
- `Answer`: User submissions with admin approval status
- `GameConfig`: Game configuration and timing settings

## Authentication
- JWT-based authentication with localStorage
- Protected routes using React Router
- Admin role-based access control
- Token expiration handling

## Specific Patterns to Follow

### API Routes
- All routes return consistent JSON responses
- Use middleware for authentication and authorization
- Implement proper HTTP status codes
- Include error handling and validation

### React Components
- Use TypeScript interfaces for props
- Implement loading states and error handling
- Use React Hook Form for form validation
- Follow accessibility guidelines

### Database Operations
- Use Prisma Client for all database operations
- Implement proper transaction handling
- Use database constraints and validation
- Follow proper indexing for performance

### Styling
- Use TailwindCSS utility classes
- Implement responsive design (mobile-first)
- Use custom animations for train movement
- Follow consistent color scheme (blue theme)

## Key Features to Remember
1. **Question Release Scheduling**: Questions are released every 48 hours automatically
2. **Admin Approval System**: All answers require admin review before progress
3. **Train Animation**: Visual train movement when user progresses
4. **Progress Tracking**: 12-step trail with visual indicators
5. **Role-based Access**: Different interfaces for users vs admins

## Error Handling
- Frontend: Use React Hot Toast for user notifications
- Backend: Consistent error response format
- Database: Proper constraint handling and validation
- Authentication: Token expiration and refresh handling

## Performance Considerations
- Implement proper loading states
- Use React.memo for expensive components
- Optimize database queries with proper relations
- Implement proper caching strategies

## Security Best Practices
- Validate all inputs on both frontend and backend
- Use parameterized queries (Prisma handles this)
- Implement rate limiting on API endpoints
- Secure JWT token handling
- Proper CORS configuration

When writing code for this project, prioritize type safety, user experience, and maintainability. Always consider the gamification aspect and ensure the train/trail theme is consistent throughout the application.
