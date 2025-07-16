# 🎰 Period-Based Gaming Platform Documentation

## 📋 Overview

The Advanced Gaming Platform now features comprehensive period-based games with multiple durations, AI dealers, provably fair algorithms, and full wallet integration. This system supports real-time betting, detailed statistics, and comprehensive game records.

## 🕐 Period Durations

All games are available in four different time periods:
- **30 seconds** - Ultra-fast action
- **1 minute** - Quick games  
- **3 minutes** - Standard duration
- **5 minutes** - Extended gameplay

## 🎮 Supported Games

### 1. 🐉 Dragon vs Tiger
**Description**: Classic Asian card game where two cards are dealt - one for Dragon, one for Tiger.

**Betting Options**:
- **Dragon** (1.95x) - Dragon card is higher
- **Tiger** (1.95x) - Tiger card is higher  
- **Tie** (8.0x) - Both cards have equal value

**Game Flow**:
1. Betting period (varies by period type)
2. Two cards dealt from shuffled deck
3. Higher card value wins
4. Aces are low (value 1)

```typescript
// API Example - Place Dragon bet
POST /api/games/bet
{
  "gameType": "dragon-tiger",
  "periodType": "1m",
  "betType": "dragon",
  "amount": 100,
  "selection": "dragon"
}
```

### 2. 🍀 Lucky 7
**Description**: Two cards are dealt, bet on whether their sum is under 7, exactly 7, or over 7.

**Betting Options**:
- **Under 7** (1.95x) - Total less than 7
- **Lucky 7** (4.5x) - Total equals exactly 7
- **Over 7** (1.95x) - Total greater than 7

**Game Flow**:
1. Two cards dealt from deck
2. Card values summed (Aces = 1, Face cards = 10)
3. Result compared to 7

```typescript
// API Example - Bet on Lucky 7
POST /api/games/bet
{
  "gameType": "lucky7",
  "periodType": "3m", 
  "betType": "lucky7",
  "amount": 50,
  "selection": "lucky7"
}
```

### 3. 🎯 Roulette (European)
**Description**: Classic roulette with numbers 0-36, comprehensive betting options.

**Betting Options**:
- **Red/Black** (1.95x) - Color bets
- **Even/Odd** (1.95x) - Parity bets
- **Low/High** (1.95x) - 1-18 or 19-36
- **Dozens** (2.9x) - 1-12, 13-24, 25-36
- **Columns** (2.9x) - Column bets
- **Single Number** (35.0x) - Straight up bet

**Game Flow**:
1. Ball spun on European wheel (0-36)
2. Multiple bet types can win simultaneously
3. Green (0) wins only for direct bets

```typescript
// API Example - Bet on Red
POST /api/games/bet
{
  "gameType": "roulette",
  "periodType": "5m",
  "betType": "red", 
  "amount": 200,
  "selection": "red"
}
```

### 4. ♠️ Blackjack (Standard)
**Description**: Classic blackjack with side bets, automated player strategy.

**Betting Options**:
- **Player** (1.95x) - Player beats dealer
- **Dealer** (1.95x) - Dealer beats player
- **Tie** (8.0x) - Both have same total
- **Royal Match** (25.0x) - First two cards same suit (King-Queen = 25x, any suit match = 3x)
- **21+3** (9.0x) - Player's two cards + dealer's first card form poker hand

**Game Flow**:
1. Two cards dealt to player and dealer
2. Automated strategy plays out hands
3. Standard blackjack rules apply
4. Side bets evaluated independently

```typescript
// API Example - Bet on Player with Royal Match side bet
POST /api/games/bet
{
  "gameType": "blackjack",
  "periodType": "1m",
  "betType": "royal-match",
  "amount": 25,
  "selection": "royal-match"
}
```

### 5. 🎭 Live Blackjack (AI Dealer)
**Description**: Enhanced blackjack with AI dealer personalities and interactive elements.

**AI Dealers**:
- **Sophia** 👩‍💼 - Friendly and encouraging
- **Marcus** 👨‍💼 - Professional and formal  
- **Luna** 👩‍🎓 - Witty and entertaining
- **Viktor** 👨‍🎓 - Serious and mathematical

**Features**:
- Real-time dealer messages
- Personality-based interactions
- Same betting options as standard blackjack
- Enhanced visual experience

### 6. 🃏 Three Card Poker
**Description**: Player and dealer each get 3 cards, best poker hand wins.

**Betting Options**:
- **Ante** (1.95x) - Player beats dealer
- **Pair Plus** (3.0x) - Player gets pair or better

**Hand Rankings**:
1. Straight Flush
2. Three of a Kind  
3. Straight
4. Flush
5. Pair
6. High Card

### 7. 🎴 Four Card Poker
**Description**: Extended poker variant with 4 cards per hand.

**Betting Options**:
- **Ante** (1.95x) - Player beats dealer
- **Aces Up** (2.0x) - Player gets pair of aces or better

### 8. 🏝️ Caribbean Stud Poker
**Description**: 5-card poker against the dealer.

**Betting Options**:
- **Ante** (1.95x) - Beat dealer's qualifying hand
- **Progressive** (100.0x) - Royal flush jackpot

### 9. 🤠 Texas Hold'em Bonus
**Description**: Casino version of Texas Hold'em against dealer.

**Betting Options**:
- **Ante** (1.95x) - Beat dealer with community cards
- **Bonus** (3.0x) - Side bet on final hand strength

## 📊 Game Records & Statistics

### Individual Game Records
Every game period maintains detailed records:

```typescript
interface GameRecord {
  gameType: string;
  periodId: string;
  periodNumber: number;
  startTime: Date;
  endTime: Date;
  result: any;
  totalBets: number;
  totalPayout: number;
  playersCount: number;
  houseEdge: number;
  profitLoss: number;
  isVerified: boolean;
}
```

### User Statistics Tracking
Comprehensive user statistics are maintained:

```typescript
interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  totalBets: number;
  totalWinnings: number;
  currentBalance: number;
  profitLoss: number;
  biggestWin: number;
  longestWinStreak: number;
  longestLossStreak: number;
}
```

## 💰 Wallet Integration

### Automatic Balance Management
- **Bet Placement**: Amount immediately deducted from balance
- **Win Processing**: Winnings automatically credited
- **Loss Handling**: No additional deduction needed
- **Refunds**: Automatic refunds for cancelled games

### Transaction Records
Every bet creates comprehensive transaction records:

```typescript
interface Transaction {
  userId: string;
  type: 'bet' | 'win' | 'refund';
  amount: number;
  description: string;
  gameId: string;
  status: 'completed' | 'pending' | 'failed';
  metadata: {
    gameType: string;
    betType: string;
    odds: number;
  };
}
```

## 🔄 Real-time Features

### Live Updates via WebSocket
```typescript
// Period started
socket.on('periodStarted', (data) => {
  console.log('New period:', data.periodId, data.gameType);
});

// Bet placed  
socket.on('betPlaced', (data) => {
  console.log('Bet placed:', data.bet, data.totalBets);
});

// Period completed
socket.on('periodCompleted', (data) => {
  console.log('Result:', data.result, data.winners);
});
```

### Live Betting Updates
- Real-time period countdown
- Live betting totals
- Player count updates
- Instant result notifications

## 📈 Advanced Analytics

### Trend Analysis
Each game type provides specialized trend analysis:

```typescript
// Dragon Tiger Trends
GET /api/games/trends/dragon-tiger
{
  "distribution": {
    "dragon": { "count": 45, "percentage": "45.0" },
    "tiger": { "count": 48, "percentage": "48.0" },
    "tie": { "count": 7, "percentage": "7.0" }
  },
  "currentStreak": { "type": "dragon", "count": 3 },
  "longestStreak": { "type": "tiger", "count": 8 }
}

// Roulette Hot/Cold Numbers
GET /api/games/trends/roulette  
{
  "hotNumbers": [
    { "number": 17, "frequency": 8 },
    { "number": 3, "frequency": 7 }
  ],
  "coldNumbers": [
    { "number": 22, "frequency": 1 },
    { "number": 35, "frequency": 1 }
  ]
}
```

### Performance Metrics
- Win rates by game type
- Average bet amounts
- Peak playing times
- Player retention rates

## 🛡️ Provably Fair Gaming

### Fairness Verification
Every game result can be independently verified:

```typescript
GET /api/games/verify/{periodId}
{
  "periodId": "dragon-tiger-1m-1640995200000",
  "result": { "dragonCard": "K♥️", "tigerCard": "7♠️", "winner": "dragon" },
  "fairnessProof": "a1b2c3d4e5f6...",
  "isVerified": true,
  "timestamp": "2023-01-01T10:00:00Z"
}
```

### Cryptographic Integrity
- SHA-256 hash generation
- Timestamped seeds
- Public verification
- Tamper-proof results

## 📱 API Reference

### Core Endpoints

#### Get Active Periods
```http
GET /api/games/periods?gameType=dragon-tiger
```

#### Place Bet
```http
POST /api/games/bet
Content-Type: application/json
Authorization: Bearer {token}

{
  "gameType": "roulette",
  "periodType": "3m", 
  "betType": "red",
  "amount": 100,
  "selection": "red"
}
```

#### Get Game History
```http
GET /api/games/history/blackjack?limit=50&page=1
```

#### Get User Statistics
```http
GET /api/games/my-stats?gameType=dragon-tiger&days=7
Authorization: Bearer {token}
```

#### Get Leaderboard
```http
GET /api/games/leaderboard?period=daily&limit=10
```

### Response Format
All API responses follow consistent format:

```typescript
{
  "success": boolean,
  "message"?: string,
  "data": any,
  "pagination"?: {
    "page": number,
    "limit": number, 
    "total": number,
    "pages": number
  }
}
```

## 🎯 Game Configuration

### Betting Limits
- **Minimum Bet**: $1
- **Maximum Bet**: $10,000
- **Rate Limiting**: 10 bets per minute per user

### House Edge
- **Dragon Tiger**: 2.5%
- **Lucky 7**: Variable (2.5% avg)
- **Roulette**: 2.7% (European)
- **Blackjack**: 2.5%
- **Poker Games**: 2.5-5.0%

### Period Timing
- **30s**: 25s betting + 5s resolution
- **1m**: 55s betting + 5s resolution  
- **3m**: 175s betting + 5s resolution
- **5m**: 295s betting + 5s resolution

## 🔧 Admin Features

### Game Management
- Force end periods
- Adjust betting limits
- View detailed analytics
- Player activity monitoring

### Analytics Dashboard
```http
GET /api/games/admin/analytics/roulette?days=30
Authorization: Bearer {admin-token}
```

Returns comprehensive analytics including:
- Daily revenue/profit trends
- Hourly activity patterns  
- Player behavior metrics
- House edge performance

## 🚀 Performance Optimizations

### Database Indexing
- Game type + period number indexes
- User ID + timestamp indexes
- Status-based filtering indexes

### Caching Strategy
- Redis caching for active periods
- Result caching for trend analysis
- User stats caching

### Real-time Efficiency
- Optimized WebSocket events
- Batched database operations
- Background result processing

## 🎮 Gaming Experience Features

### Visual Enhancements
- Animated card reveals
- Live countdown timers
- Real-time bet tracking
- Interactive result displays

### Mobile Optimization
- Touch-friendly betting interface
- Responsive period displays
- Offline bet queueing
- Push notifications for results

### Social Features
- Live leaderboards
- Achievement badges
- Win streak tracking
- Player activity feeds

## 📋 Betting Strategies Support

### Statistical Tools
- Hot/cold number tracking
- Streak analysis
- Pattern recognition
- Probability calculations

### Responsible Gaming
- Betting limits enforcement
- Loss limits
- Session time tracking
- Cool-down periods

This comprehensive period-based gaming system provides enterprise-grade functionality with full wallet integration, detailed statistics, and provably fair gaming mechanics across all supported game types.