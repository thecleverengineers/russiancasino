import mongoose, { Schema, Document } from 'mongoose';

export interface IPeriodGame extends Document {
  gameType: string;
  periodNumber: number;
  result: any;
  timestamp: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PeriodGameSchema = new Schema<IPeriodGame>({
  gameType: {
    type: String,
    required: true,
    enum: [
      'blackjack', 'dragon-tiger', 'lucky7', 'roulette',
      'three-card-poker', 'four-card-poker', 'caribbean-stud',
      'texas-holdem', 'live-blackjack'
    ],
    index: true
  },
  periodNumber: {
    type: Number,
    required: true,
    index: true
  },
  result: {
    type: Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
PeriodGameSchema.index({ gameType: 1, periodNumber: -1 });
PeriodGameSchema.index({ gameType: 1, timestamp: -1 });

// Static method to get recent results
PeriodGameSchema.statics.getRecentResults = async function(gameType: string, limit: number = 50) {
  return this.find({ gameType, isActive: true })
    .sort({ periodNumber: -1 })
    .limit(limit)
    .select('periodNumber result timestamp')
    .lean();
};

// Static method to get result statistics
PeriodGameSchema.statics.getResultStats = async function(gameType: string, days: number = 7) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  // Different stats based on game type
  switch (gameType) {
    case 'dragon-tiger':
      return this.aggregate([
        {
          $match: {
            gameType,
            timestamp: { $gte: fromDate }
          }
        },
        {
          $group: {
            _id: '$result.winner',
            count: { $sum: 1 }
          }
        }
      ]);

    case 'roulette':
      return this.aggregate([
        {
          $match: {
            gameType,
            timestamp: { $gte: fromDate }
          }
        },
        {
          $group: {
            _id: {
              color: '$result.color',
              isEven: '$result.isEven'
            },
            count: { $sum: 1 },
            numbers: { $push: '$result.number' }
          }
        }
      ]);

    case 'lucky7':
      return this.aggregate([
        {
          $match: {
            gameType,
            timestamp: { $gte: fromDate }
          }
        },
        {
          $group: {
            _id: '$result.result',
            count: { $sum: 1 },
            avgTotal: { $avg: '$result.total' }
          }
        }
      ]);

    default:
      return this.aggregate([
        {
          $match: {
            gameType,
            timestamp: { $gte: fromDate }
          }
        },
        {
          $group: {
            _id: '$result.winner',
            count: { $sum: 1 }
          }
        }
      ]);
  }
};

export const PeriodGame = mongoose.model<IPeriodGame>('PeriodGame', PeriodGameSchema);