import mongoose, { Schema, Document } from 'mongoose';

export interface IGameRecord extends Document {
  gameType: string;
  periodId: string;
  periodNumber: number;
  startTime: Date;
  endTime: Date;
  result: any;
  totalBets: number;
  totalPayout: number;
  playersCount: number;
  players: any[];
  houseEdge: number;
  profitLoss: number;
  isVerified: boolean;
  fairnessProof?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GameRecordSchema = new Schema<IGameRecord>({
  gameType: {
    type: String,
    required: true,
    enum: [
      'blackjack', 'dragon-tiger', 'lucky7', 'roulette',
      'three-card-poker', 'four-card-poker', 'caribbean-stud',
      'texas-holdem', 'live-blackjack'
    ]
  },
  periodId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  periodNumber: {
    type: Number,
    required: true,
    index: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  result: {
    type: Schema.Types.Mixed,
    required: true
  },
  totalBets: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalPayout: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  playersCount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  players: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    bets: [{
      id: String,
      betType: String,
      amount: Number,
      selection: Schema.Types.Mixed,
      odds: Number,
      status: {
        type: String,
        enum: ['pending', 'won', 'lost'],
        default: 'pending'
      },
      payout: {
        type: Number,
        default: 0
      },
      placedAt: Date
    }],
    totalBetAmount: {
      type: Number,
      default: 0
    },
    totalWinnings: {
      type: Number,
      default: 0
    },
    joinedAt: Date
  }],
  houseEdge: {
    type: Number,
    default: 0.025 // 2.5% default house edge
  },
  profitLoss: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  fairnessProof: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
GameRecordSchema.index({ gameType: 1, periodNumber: -1 });
GameRecordSchema.index({ startTime: -1 });
GameRecordSchema.index({ endTime: -1 });
GameRecordSchema.index({ 'players.userId': 1 });

// Calculate profit/loss before saving
GameRecordSchema.pre('save', function(next) {
  this.profitLoss = this.totalBets - this.totalPayout;
  next();
});

// Virtual for game duration
GameRecordSchema.virtual('duration').get(function() {
  return this.endTime.getTime() - this.startTime.getTime();
});

// Static method to get game statistics
GameRecordSchema.statics.getGameStats = async function(gameType: string, days: number = 30) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        gameType,
        endTime: { $gte: fromDate }
      }
    },
    {
      $group: {
        _id: null,
        totalGames: { $sum: 1 },
        totalBets: { $sum: '$totalBets' },
        totalPayout: { $sum: '$totalPayout' },
        totalPlayers: { $sum: '$playersCount' },
        avgBetPerGame: { $avg: '$totalBets' },
        avgPayoutPerGame: { $avg: '$totalPayout' },
        totalProfit: { $sum: '$profitLoss' }
      }
    }
  ]);

  return stats[0] || {
    totalGames: 0,
    totalBets: 0,
    totalPayout: 0,
    totalPlayers: 0,
    avgBetPerGame: 0,
    avgPayoutPerGame: 0,
    totalProfit: 0
  };
};

// Instance method to verify game result
GameRecordSchema.methods.verifyResult = function() {
  // This would implement provably fair verification logic
  this.isVerified = true;
  return this.save();
};

export const GameRecord = mongoose.model<IGameRecord>('GameRecord', GameRecordSchema);