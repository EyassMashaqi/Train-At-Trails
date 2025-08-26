# Production Deployment Guide

This guide covers deploying the Train at Trails application to a production server with PostgreSQL.

## Prerequisites

- Node.js 18+ on your server
- PostgreSQL database
- Domain name (optional)
- SSL certificate (recommended)

## Database Setup

### 1. PostgreSQL Installation
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User
```bash
# Access PostgreSQL as postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE bvisionry_lighthouse;

# Create user
CREATE USER train_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE bvisionry_lighthouse TO train_user;

# Exit
\q
```

## Environment Configuration

### 1. Clone Repository
```bash
git clone https://github.com/EyassMashaqi/Train-At-Trails.git
cd Train-At-Trails
```

### 2. Configure Backend Environment
```bash
cd backend
cp .env.example .env
```

Edit the `.env` file with production values:
```bash
# Database Configuration
DATABASE_URL="postgresql://train_user:your_secure_password@localhost:5432/bvisionry_lighthouse"

# JWT Configuration
JWT_SECRET="your-super-secure-jwt-secret-key-change-this-in-production"

# Server Configuration
PORT=3000
NODE_ENV=production

# Admin User Configuration
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="secure_admin_password"

# Game Configuration
QUESTION_RELEASE_INTERVAL_HOURS=48

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME="Train at Trails"

# Password Reset Configuration
RESET_TOKEN_EXPIRY_MINUTES=60

# Frontend URL (for email links)
FRONTEND_URL=https://yourdomain.com
```

### 3. Install Dependencies
```bash
# Backend dependencies
npm install

# Frontend dependencies
cd ../frontend
npm install
```

## Database Migration

```bash
# From backend directory
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma db push

# Seed the database (optional)
npm run seed
```

## Build Applications

### 1. Build Frontend
```bash
cd frontend
npm run build

# The build files will be in the 'dist' directory
```

### 2. Build Backend (if using TypeScript compilation)
```bash
cd backend
npm run build  # If you have a build script
```

## Production Deployment Options

### Option 1: PM2 (Recommended)

#### Install PM2
```bash
npm install -g pm2
```

#### Create PM2 Configuration
Create `ecosystem.config.js` in the root directory:
```javascript
module.exports = {
  apps: [
    {
      name: 'train-at-trails-backend',
      script: './backend/src/index.ts',
      interpreter: 'npx',
      interpreter_args: 'ts-node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      cwd: './backend'
    }
  ]
};
```

#### Start with PM2
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### Option 2: Docker (Alternative)

#### Create Dockerfile for Backend
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
```

#### Create Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://train_user:password@db:5432/bvisionry_lighthouse
    depends_on:
      - db
  
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: bvisionry_lighthouse
      POSTGRES_USER: train_user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Web Server Configuration (Nginx)

### 1. Install Nginx
```bash
sudo apt install nginx
```

### 2. Create Nginx Configuration
Create `/etc/nginx/sites-available/train-at-trails`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (static files)
    location / {
        root /path/to/Train-At-Trails/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/train-at-trails /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring and Maintenance

### 1. PM2 Monitoring
```bash
# View application status
pm2 status

# View logs
pm2 logs

# Restart application
pm2 restart all

# Monitor resources
pm2 monit
```

### 2. Database Backup
```bash
# Create backup script
#!/bin/bash
pg_dump -h localhost -U train_user bvisionry_lighthouse > backup_$(date +%Y%m%d_%H%M%S).sql

# Schedule with cron
0 2 * * * /path/to/backup_script.sh
```

### 3. Log Rotation
Configure log rotation for application logs and Nginx logs.

## Security Considerations

1. **Firewall**: Configure UFW or iptables
2. **Database**: Restrict PostgreSQL access
3. **Environment Variables**: Never commit production secrets
4. **Regular Updates**: Keep Node.js, PostgreSQL, and dependencies updated
5. **Monitoring**: Set up application and server monitoring

## Troubleshooting

### Common Issues

1. **Database Connection**: Check PostgreSQL is running and credentials are correct
2. **Port Conflicts**: Ensure ports 3000 and 80/443 are available
3. **File Permissions**: Check read/write permissions for application files
4. **Environment Variables**: Verify all required variables are set

### Logs Locations
- **Application**: PM2 logs or console output
- **Nginx**: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- **PostgreSQL**: `/var/log/postgresql/postgresql-*.log`

## Performance Optimization

1. **Database Indexing**: Ensure proper indexes on frequently queried columns
2. **Caching**: Implement Redis for session storage and caching
3. **CDN**: Use a CDN for static assets
4. **Compression**: Enable gzip compression in Nginx
5. **Database Connection Pooling**: Configure connection pooling for PostgreSQL

## Backup and Recovery

1. **Database Backups**: Regular automated backups
2. **Application Files**: Backup configuration and uploaded files
3. **Disaster Recovery**: Document recovery procedures
4. **Testing**: Regularly test backup restoration

This deployment guide should provide a solid foundation for deploying your Train at Trails application to production with PostgreSQL.
