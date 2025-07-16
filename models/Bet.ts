import mongoose, { Schema, Document } from 'mongoose';

export interface IBet extends Document {
  userId: mongoose.Types.ObjectId;
  gameId: string;
  gameType: string;
  periodId?: string;
  periodNumber?: number;
  betType: string;
  amount: number;
  selection: any;
  odds: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled' | 'refunded';
  payout: number;
  result?: any;
  multiplier: number;
  isWinner: boolean;
  placedAt: Date;
  settledAt?: Date;
  seed?: string;
  fairnessProof?: string;
  metadata?: {
    ip?: string;
    userAgent?: string;
    location?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BetSchema = new Schema<IBet>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  gameId: {
    type: String,
    required: true,
    index: true
  },
  gameType: {
    type: String,
    required: true,
    enum: [
      'blackjack', 'dragon-tiger', 'lucky7', 'roulette',
      'three-card-poker', 'four-card-poker', 'caribbean-stud',
      'texas-holdem', 'live-blackjack', 'toss', 'slots', 'raffle'
    ],
    index: true
  },
  periodId: {
    type: String,
    index: true
  },
  periodNumber: {
    type: Number,
    index: true
  },
  betType: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
    max: 100000
  },
  selection: {
    type: Schema.Types.Mixed,
    required: true
  },
  odds: {
    type: Number,
    required: true,
    min: 1.0,
    max: 1000.0
  },
  status: {
    type: String,
    enum: ['pending', 'won', 'lost', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  payout: {
    type: Number,
    default: 0,
    min: 0
  },
  result: {
    type: Schema.Types.Mixed
  },
  multiplier: {
    type: Number,
    default: 0,
    min: 0
  },
  isWinner: {
    type: Boolean,
    default: false,
    index: true
  },
  placedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  settledAt: {
    type: Date
  },
  seed: {
    type: String
  },
  fairnessProof: {
    type: String
  },
  metadata: {
    ip: String,
    userAgent: String,
    location: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
BetSchema.index({ userId: 1, placedAt: -1 });
BetSchema.index({ gameType: 1, placedAt: -1 });
BetSchema.index({ periodId: 1, status: 1 });
BetSchema.index({ userId: 1, gameType: 1, placedAt: -1 });

// Calculate payout before saving
BetSchema.pre('save', function(next) {
  if (this.status === 'won') {
    this.payout = this.amount * this.odds;
    this.multiplier = this.odds;
    this.isWinner = true;
  } else {
    this.payout = 0;
    this.multiplier = 0;
    this.isWinner = false;
  }
  
  if (this.status !== 'pending' && !this.settledAt) {
    this.settledAt = new Date();
  }
  
  next();
});

// Static methods for bet analytics
BetSchema.statics.getUserBetStats = async function(userId: string, gameType?: string, days?: number) {
  const matchQuery: any = { userId };
  
  if (gameType) {
    matchQuery.gameType = gameType;
  }
  
  if (days) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    matchQuery.placedAt = { $gte: fromDate };
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalBets: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalPayout: { $sum: '$payout' },
        wonBets: {
          $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] }
        },
        lostBets: {
          $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] }
        },
        avgBetAmount: { $avg: '$amount' },
        maxBetAmount: { $max: '$amount' },
        minBetAmount: { $min: '$amount' },
        biggestWin: { $max: '$payout' }
      }
    }
  ]);

  const result = stats[0] || {
    totalBets: 0,
    totalAmount: 0,
    totalPayout: 0,
    wonBets: 0,
    lostBets: 0,
    avgBetAmount: 0,
    maxBetAmount: 0,
    minBetAmount: 0,
    biggestWin: 0
  };

  result.winRate = result.totalBets > 0 ? (result.wonBets / result.totalBets * 100) : 0;
  result.profitLoss = result.totalPayout - result.totalAmount;
  result.roi = result.totalAmount > 0 ? (result.profitLoss / result.totalAmount * 100) : 0;

  return result;
};

BetSchema.statics.getGameStats = async function(gameType: string, days?: number) {
  const matchQuery: any = { gameType };
  
  if (days) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    matchQuery.placedAt = { $gte: fromDate };
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalBets: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalPayout: { $sum: '$payout' },
        uniquePlayers: { $addToSet: '$userId' },
        avgBetAmount: { $avg: '$amount' },
        houseProfit: { $sum: { $subtract: ['$amount', '$payout'] } }
      }
    }
  ]);

  const result = stats[0];
  if (result) {
    result.uniquePlayersCount = result.uniquePlayers.length;
    delete result.uniquePlayers;
    result.houseEdge = result.totalAmount > 0 ? (result.houseProfit / result.totalAmount * 100) : 0;
  }

  return result;
};

BetSchema.statics.getBetHistory = async function(
  userId: string, 
  options: {
    gameType?: string;
    status?: string;
    limit?: number;
    skip?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
) {
  const {
    gameType,
    status,
    limit = 50,
    skip = 0,
    sortBy = 'placedAt',
    sortOrder = 'desc'
  } = options;

  const matchQuery: any = { userId };
  
  if (gameType) matchQuery.gameType = gameType;
  if (status) matchQuery.status = status;

  const sortQuery: any = {};
  sortQuery[sortBy] = sortOrder === 'desc' ? -1 : 1;

  return this.find(matchQuery)
    .sort(sortQuery)
    .skip(skip)
    .limit(limit)
    .populate('gameId', 'result periodNumber')
    .lean();
};

BetSchema.statics.getWinStreaks = async function(userId: string, gameType?: string) {
  const matchQuery: any = { userId };
  if (gameType) matchQuery.gameType = gameType;

  const bets = await this.find(matchQuery)
    .sort({ placedAt: 1 })
    .select('status placedAt')
    .lean();

  let currentStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  for (const bet of bets) {
    if (bet.status === 'won') {
      currentWinStreak++;
      currentLossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else if (bet.status === 'lost') {
      currentLossStreak++;
      currentWinStreak = 0;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    }
  }

  return {
    currentWinStreak,
    currentLossStreak,
    longestWinStreak,
    longestLossStreak
  };
};

// Instance methods
BetSchema.methods.settle = function(result: any, isWinner: boolean) {
  this.result = result;
  this.status = isWinner ? 'won' : 'lost';
  this.settledAt = new Date();
  return this.save();
};

BetSchema.methods.cancel = function(reason?: string) {
  this.status = 'cancelled';
  this.settledAt = new Date();
  if (reason) {
    this.metadata = { ...this.metadata, cancellationReason: reason };
  }
  return this.save();
};

BetSchema.methods.refund = function(reason?: string) {
  this.status = 'refunded';
  this.settledAt = new Date();
  if (reason) {
    this.metadata = { ...this.metadata, refundReason: reason };
  }
  return this.save();
};

export const Bet = mongoose.model<IBet>('Bet', BetSchema);