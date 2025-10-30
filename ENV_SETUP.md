# Environment Variables Setup Guide

## 🚀 Quick Setup

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Update the values in `.env` file according to your setup.

## 📋 Required Environment Variables

### Database Configuration

- **MONGO_DB**: MongoDB connection string
  - Local: `mongodb://localhost:27017/nasiya_db`
  - Atlas: `mongodb+srv://username:password@cluster.mongodb.net/nasiya_db`

### JWT Configuration

- **JWT_ACCESS_KEY**: Secret key for access tokens (generate strong random string)
- **JWT_REFRESH_KEY**: Secret key for refresh tokens (generate strong random string)

### Telegram Bot Configuration

- **BOT_TOKEN**: Get from [@BotFather](https://t.me/BotFather) on Telegram
- **BOT_USERNAME**: Your bot's username (without @)

### CORS Configuration

- **DASHBOARD_HOST_URL**: Frontend dashboard URL (e.g., `http://localhost:5173`)
- **BOT_HOST_URL**: Backend API URL (e.g., `http://localhost:3000`)

### Super Admin Configuration

- **ADMIN_FIRSTNAME**: Super admin first name
- **ADMIN_LASTNAME**: Super admin last name
- **ADMIN_PHONENUMBER**: Super admin phone number (e.g., `+998901234567`)
- **ADMIN_PASSWORD**: Super admin password (change in production!)

## 🔐 Security Best Practices

### JWT Keys Generation

Generate strong random keys using one of these methods:

```bash
# Method 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Method 2: Using OpenSSL
openssl rand -hex 64

# Method 3: Using online generator
# Visit: https://generate-secret.vercel.app/64
```

### Production Security Checklist

- [ ] Use strong, unique JWT keys
- [ ] Use HTTPS URLs for production
- [ ] Set NODE_ENV=production
- [ ] Use secure MongoDB connection with authentication
- [ ] Enable MongoDB Atlas IP whitelist
- [ ] Use environment-specific bot tokens

## 🌍 Environment-Specific Configurations

### Development (.env)

```env
NODE_ENV=development
MONGO_DB=mongodb://localhost:27017/nasiya_dev
DASHBOARD_HOST_URL=http://localhost:5173
BOT_HOST_URL=http://localhost:3000
```

### Production (.env.production)

```env
NODE_ENV=production
MONGO_DB=mongodb+srv://user:pass@cluster.mongodb.net/nasiya_prod
DASHBOARD_HOST_URL=https://dashboard.yourdomain.com
BOT_HOST_URL=https://api.yourdomain.com
```

## 🤖 Telegram Bot Setup

1. Create a new bot:

   - Message [@BotFather](https://t.me/BotFather)
   - Send `/newbot`
   - Follow the instructions
   - Copy the token to `BOT_TOKEN`

2. Set bot commands (optional):
   ```
   /setcommands
   start - Botni ishga tushirish
   help - Yordam
   ```

## 📊 MongoDB Setup

### Local MongoDB

1. Install MongoDB locally
2. Start MongoDB service
3. Use: `mongodb://localhost:27017/nasiya_db`

### MongoDB Atlas (Cloud)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Create database user
4. Get connection string
5. Replace `<password>` and `<dbname>`

## 🔧 Optional Configurations

### Email (SMTP)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### Redis (Caching)

```env
REDIS_URL=redis://localhost:6379
```

### File Upload

```env
MAX_FILE_SIZE=5242880  # 5MB in bytes
UPLOAD_PATH=./uploads
```

## 🚨 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**

   - Check if MongoDB is running
   - Verify connection string
   - Check network connectivity

2. **JWT Token Error**

   - Ensure JWT keys are set
   - Check key length (should be long)
   - Verify no extra spaces

3. **Bot Not Responding**

   - Verify BOT_TOKEN is correct
   - Check bot is not used elsewhere
   - Ensure bot is not blocked

4. **CORS Error**
   - Check DASHBOARD_HOST_URL matches frontend
   - Verify no trailing slashes
   - Check protocol (http/https)

## 📝 Environment Variables Reference

| Variable           | Required | Default     | Description              |
| ------------------ | -------- | ----------- | ------------------------ |
| NODE_ENV           | No       | development | Environment mode         |
| PORT               | No       | 3000        | Server port              |
| MONGO_DB           | Yes      | -           | MongoDB connection       |
| JWT_ACCESS_KEY     | Yes      | -           | JWT access token secret  |
| JWT_REFRESH_KEY    | Yes      | -           | JWT refresh token secret |
| BOT_TOKEN          | Yes      | -           | Telegram bot token       |
| BOT_USERNAME       | No       | -           | Telegram bot username    |
| DASHBOARD_HOST_URL | Yes      | -           | Frontend URL             |
| BOT_HOST_URL       | Yes      | -           | Backend URL              |
| SESSION_SECRET     | No       | -           | Session secret           |
| MAX_FILE_SIZE      | No       | 5242880     | Max upload size          |
| UPLOAD_PATH        | No       | ./uploads   | Upload directory         |
| LOG_LEVEL          | No       | info        | Logging level            |
