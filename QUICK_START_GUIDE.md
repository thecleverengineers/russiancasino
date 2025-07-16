# 🚀 Quick Start Guide - Period-Based Gaming Platform

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **MongoDB** >= 5.0
- **Redis** >= 6.0 (optional but recommended)
- **npm** >= 9.0.0

## 🛠️ Installation & Setup

### 1. Install Dependencies
```bash
# Install all dependencies
npm install

# Install TypeScript globally (if not already installed)
npm install -g typescript
```

### 2. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit the environment file with your settings
nano .env
```

**Required Environment Variables:**
```bash
# Application
NODE_ENV=development
PORT=7777
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/gaming_platform
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-for-development
JWT_REFRESH_SECRET=your-refresh-secret-key-for-development

# Optional: Payment gateways (for full functionality)
STRIPE_SECRET_KEY=sk_test_your_stripe_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Optional: Notifications
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Database Setup
```bash
# Start MongoDB (if not running)
mongod

# Start Redis (if available)
redis-server

# The application will create collections automatically
```

## 🎮 Running the Application

### Development Mode
```bash
# Start both frontend and backend in development mode
npm run dev

# Or start them separately:
npm run server:dev    # Backend only
npm run client:dev    # Frontend only
```

### Production Mode
```bash
# Build the application
npm run build

# Start in production mode
npm start
```

## 🧪 Testing the Period Games

### 1. Register a Test User
```bash
curl -X POST http://localhost:7777/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

### 2. Login and Get Token
```bash
curl -X POST http://localhost:7777/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Response will include:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "username": "testuser",
      "balance": 1000
    }
  }
}
```

### 3. View Active Game Periods
```bash
curl -X GET http://localhost:7777/api/games/periods
```

**Response:**
```json
{
  "success": true,
  "data": {
    "periods": [
      {
        "id": "dragon-tiger-1m-1640995200000",
        "gameType": "dragon-tiger",
        "periodNumber": 12345,
        "status": "betting",
        "timeRemaining": 45000,
        "totalBets": 2500,
        "playersCount": 15
      }
    ]
  }
}
```

### 4. Place Your First Bet
```bash
curl -X POST http://localhost:7777/api/games/bet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "gameType": "dragon-tiger",
    "periodType": "1m",
    "betType": "dragon",
    "amount": 50,
    "selection": "dragon"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Bet placed successfully",
  "data": {
    "bet": {
      "id": "bet_id",
      "amount": 50,
      "odds": 1.95,
      "status": "pending"
    },
    "newBalance": 950
  }
}
```

## 📊 Exploring Game Features

### Check Game Results
```bash
# Get recent results for Dragon Tiger
curl -X GET http://localhost:7777/api/games/results/dragon-tiger?limit=10
```

### View Your Betting History
```bash
curl -X GET http://localhost:7777/api/games/my-bets \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Check Your Statistics
```bash
curl -X GET http://localhost:7777/api/games/my-stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### View Leaderboard
```bash
curl -X GET http://localhost:7777/api/games/leaderboard?period=daily&limit=10
```

### Analyze Game Trends
```bash
# Dragon Tiger trends
curl -X GET http://localhost:7777/api/games/trends/dragon-tiger

# Roulette hot/cold numbers
curl -X GET http://localhost:7777/api/games/trends/roulette
```

## 🎰 Testing Different Games

### Dragon vs Tiger
```bash
curl -X POST http://localhost:7777/api/games/bet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "gameType": "dragon-tiger",
    "periodType": "3m",
    "betType": "tie",
    "amount": 25,
    "selection": "tie"
  }'
```

### Lucky 7
```bash
curl -X POST http://localhost:7777/api/games/bet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "gameType": "lucky7",
    "periodType": "1m",
    "betType": "lucky7",
    "amount": 100,
    "selection": "lucky7"
  }'
```

### Roulette
```bash
curl -X POST http://localhost:7777/api/games/bet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "gameType": "roulette",
    "periodType": "5m",
    "betType": "red",
    "amount": 200,
    "selection": "red"
  }'
```

### Blackjack with Side Bet
```bash
curl -X POST http://localhost:7777/api/games/bet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "gameType": "blackjack",
    "periodType": "1m",
    "betType": "royal-match",
    "amount": 50,
    "selection": "royal-match"
  }'
```

## 🔄 Real-time WebSocket Testing

### Connect to WebSocket
```javascript
// In browser console or Node.js
const socket = io('http://localhost:7777', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

// Listen for period events
socket.on('periodStarted', (data) => {
  console.log('New period started:', data);
});

socket.on('betPlaced', (data) => {
  console.log('Bet placed:', data);
});

socket.on('periodCompleted', (data) => {
  console.log('Period completed:', data);
});

// Join a specific game
socket.emit('join-game', 'dragon-tiger-1m-1640995200000');
```

## 📈 Monitoring & Analytics

### Health Check
```bash
curl -X GET http://localhost:7777/api/health
```

### Socket Info
```bash
curl -X GET http://localhost:7777/api/socket-info
```

### Game Statistics
```bash
curl -X GET http://localhost:7777/api/games/stats/dragon-tiger?days=7
```

## 🛠️ Development Tools

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Testing
```bash
npm test
npm run test:coverage
```

### Build Analysis
```bash
npm run analyze
```

## 🐳 Docker Development

### Using Docker Compose
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Setup
```bash
# Build the image
docker build -t gaming-platform .

# Run with environment variables
docker run -p 7777:7777 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/gaming_platform \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  gaming-platform
```

## 🔧 Troubleshooting

### Common Issues

#### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongod --version
ps aux | grep mongod

# Start MongoDB
mongod --dbpath /your/data/path
```

#### Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
redis-server
```

#### Port Already in Use
```bash
# Check what's using port 7777
lsof -i :7777

# Kill the process
kill -9 PID
```

#### TypeScript Compilation Errors
```bash
# Clean and rebuild
rm -rf node_modules package-lock.json
npm install
npm run type-check
```

### Debug Mode
```bash
# Run with debug logging
DEBUG=gaming-platform:* npm run server:dev
```

### Database Reset
```bash
# Connect to MongoDB
mongo gaming_platform

# Drop collections
db.gamerecords.drop()
db.periodgames.drop()
db.bets.drop()
db.transactions.drop()
```

## 📊 Performance Monitoring

### Monitor Active Periods
```bash
# Check active periods
curl -X GET http://localhost:7777/api/games/periods | jq '.data.count'

# Monitor specific game
curl -X GET "http://localhost:7777/api/games/periods?gameType=dragon-tiger"
```

### Database Performance
```bash
# Check MongoDB performance
mongo gaming_platform --eval "db.stats()"

# Check indexes
mongo gaming_platform --eval "db.bets.getIndexes()"
```

### Memory Usage
```bash
# Check Node.js memory usage
curl -X GET http://localhost:7777/api/health | jq
```

## 🎯 Next Steps

1. **Frontend Integration**: Connect React components to the API
2. **Payment Gateway**: Configure Stripe/Razorpay for real payments
3. **Notifications**: Set up email/SMS notifications
4. **Analytics**: Implement comprehensive analytics dashboard
5. **Mobile App**: Develop native mobile applications
6. **Load Testing**: Test with multiple concurrent users

## 📚 Additional Resources

- **API Documentation**: `/PERIOD_GAMES_DOCUMENTATION.md`
- **Advanced Features**: `/ADVANCED_FEATURES.md`
- **Environment Setup**: `/.env.example`
- **Docker Configuration**: `/docker-compose.yml`

## 🆘 Support

If you encounter any issues:

1. Check the logs: `tail -f logs/combined.log`
2. Verify environment variables: `printenv | grep MONGODB`
3. Test database connection: `mongo $MONGODB_URI`
4. Check the troubleshooting section above
5. Review the comprehensive documentation files

The platform is now ready for development and testing with full period-based gaming functionality!