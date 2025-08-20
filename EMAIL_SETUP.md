# Email Service Setup Guide

## Overview

Your Train-At-Trails application now includes a comprehensive email service that sends notifications for:

- Welcome emails for new users
- Answer submission confirmations
- Answer feedback with grades and medals
- New question release notifications
- Bulk notifications (admin only)
- Password reset emails (future feature)

## Gmail SMTP Configuration

### Step 1: Generate Gmail App Password

1. **Enable 2-Factor Authentication** on your Gmail account (required)
2. Go to your Google Account settings: https://myaccount.google.com/
3. Click on **Security** in the left sidebar
4. Under "Signing in to Google", click on **App passwords**
5. Select **Mail** and **Other (Custom name)**
6. Enter "Train at Trails" as the name
7. Click **Generate**
8. Copy the 16-character app password (e.g., `abcd efgh ijkl mnop`)

### Step 2: Configure Environment Variables

Add these variables to your `backend/.env` file:

```env
# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcd-efgh-ijkl-mnop
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME="Train at Trails"

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173
```

**Important Notes:**
- Replace `your-email@gmail.com` with your actual Gmail address
- Replace `abcd-efgh-ijkl-mnop` with your generated app password
- Use the app password, NOT your regular Gmail password
- Keep spaces in the app password or remove them (both work)

## Email Features

### 1. Automatic Email Notifications

**Answer Submission**: Users automatically receive confirmation emails when they submit answers.

**Answer Feedback**: Users receive emails with their grade (🥇🥈🥉❌) and feedback when admins review their submissions.

### 2. Admin Email Tools

Access admin email features at: `/api/admin/email/`

**Test Email**: Send test emails to verify configuration
```bash
POST /api/admin/email/test
{
  "to": "user@example.com",
  "subject": "Test Email",
  "message": "This is a test message"
}
```

**Welcome Email**: Send welcome emails to specific users
```bash
POST /api/admin/email/welcome/:userId
```

**Bulk Notifications**: Send emails to all users or specific cohort
```bash
POST /api/admin/email/notification/bulk
{
  "subject": "Important Announcement",
  "message": "Your message here...",
  "cohortId": "optional-cohort-id"
}
```

**Configuration Status**: Check email setup status
```bash
GET /api/admin/email/config/status
```

### 3. Email Templates

The service includes beautiful, responsive email templates with:
- Train at Trails branding
- Medal icons (🥇🥈🥉❌)
- Grade-specific colors
- Call-to-action buttons
- Mobile-friendly design

## Testing Your Setup

### Method 1: Using the API

1. Start your backend server: `npm run dev`
2. Login as admin
3. Use a tool like Postman or curl:

```bash
curl -X POST http://localhost:3000/api/admin/email/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-test-email@gmail.com",
    "subject": "Test Email",
    "message": "If you receive this, email is working!"
  }'
```

### Method 2: Submit an Answer

1. Login as a regular user
2. Submit an answer to any question
3. Check your email for the submission confirmation

### Method 3: Grade an Answer

1. Login as admin
2. Grade a submitted answer
3. Check the user's email for feedback notification

## Troubleshooting

### Common Issues

**"Invalid login" Error**:
- Make sure you're using the App Password, not your regular password
- Verify 2-Factor Authentication is enabled
- Double-check the email address

**"Connection timeout" Error**:
- Check your internet connection
- Verify SMTP_HOST and SMTP_PORT are correct
- Try SMTP_SECURE=true with SMTP_PORT=465

**"Email not sending" but no errors**:
- Check spam/junk folders
- Verify SMTP_FROM_EMAIL matches SMTP_USER
- Ensure FRONTEND_URL is correct for email links

### Environment Variable Validation

The system will log email configuration status on startup:
```
✅ Email service is ready to send emails
```

If you see an error, check your `.env` file configuration.

### Testing Configuration

Use the admin endpoint to check your setup:
```bash
GET /api/admin/email/config/status
```

This will show:
- SMTP host and port
- Configured email address
- Whether all required variables are set

## Production Deployment

### For Ubuntu Server:

1. **Use a dedicated email account** for your application
2. **Set strong environment variables**:
   ```bash
   SMTP_USER=trainattrails@yourdomain.com
   SMTP_FROM_NAME="Your Organization Name"
   FRONTEND_URL=https://yourdomain.com
   ```

3. **Consider email limits**:
   - Gmail: 500 emails/day for regular accounts
   - G Suite: 2000 emails/day
   - For high volume, consider services like SendGrid, Mailgun, or AWS SES

4. **Monitor email delivery**:
   - Check server logs for email errors
   - Monitor bounce rates
   - Set up email delivery monitoring

### Alternative SMTP Providers

The service works with any SMTP provider. Just update the configuration:

**SendGrid**:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Mailgun**:
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

## Email Templates Customization

Email templates are defined in `backend/src/services/emailService.ts`. You can customize:

- Colors and styling
- Email content
- Company branding
- Button text and links
- Medal representations

## Security Notes

- Never commit your `.env` file to version control
- Use App Passwords, not regular passwords
- Rotate credentials regularly
- Monitor for suspicious email activity
- Consider rate limiting for bulk emails

## Support

If you encounter issues:

1. Check the server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test with the `/api/admin/email/test` endpoint
4. Ensure your Gmail account has 2FA enabled and App Password generated

The email service is designed to fail gracefully - if emails can't be sent, the application will continue to work normally, just without email notifications.
