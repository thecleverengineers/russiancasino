import express, { Router, Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { userRateLimit } from '../middleware/auth.js';
import { AdvancedGameEngine } from '../services/AdvancedGameEngine.js';
import { Bet } from '../models/Bet.js';
import { GameRecord } from '../models/GameRecord.js';
import { PeriodGame } from '../models/PeriodGame.js';
import { User } from '../models/User.js';
import { catchAsync } from '../middleware/errorHandler.js';

const router: Router = express.Router();
const gameEngine = new AdvancedGameEngine();

// Get all active periods for all games or specific game type
router.get('/periods', catchAsync(async (req: Request, res: Response) => {
  const { gameType } = req.query;
  
  const activePeriods = await gameEngine.getActivePeriods(gameType as string);
  
  res.json({
    success: true,
    data: {
      periods: activePeriods,
      count: activePeriods.length
    }
  });
}));

// Get specific game period details
router.get('/periods/:periodId', catchAsync(async (req: Request, res: Response) => {
  const { periodId } = req.params;
  
  const period = gameEngine.getGame(periodId);
  
  if (!period) {
    return res.status(404).json({
      success: false,
      message: 'Period not found'
    });
  }
  
  res.json({
    success: true,
    data: period
  });
}));

// Place bet in period game
router.post('/bet', 
  authMiddleware,
  userRateLimit(10, 60000), // 10 bets per minute
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const { gameType, periodType, betType, amount, selection } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (!gameType || !betType || !amount || selection === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: gameType, betType, amount, selection'
      });
    }

    if (amount < 1 || amount > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Bet amount must be between $1 and $10,000'
      });
    }

    const result = await gameEngine.placePeriodBet(
      userId,
      gameType,
      periodType || '1m',
      betType,
      amount,
      selection
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        bet: result.bet,
        newBalance: req.user!.balance - amount
      }
    });
  })
);

// Get game history for specific game type
router.get('/history/:gameType', catchAsync(async (req: Request, res: Response) => {
  const { gameType } = req.params;
  const { limit = 50, page = 1 } = req.query;
  
  const limitNum = Math.min(parseInt(limit as string), 100);
  const skip = (parseInt(page as string) - 1) * limitNum;
  
  const history = await GameRecord.find({ gameType })
    .sort({ endTime: -1 })
    .skip(skip)
    .limit(limitNum)
    .select('periodNumber result endTime totalBets totalPayout playersCount')
    .lean();

  const totalCount = await GameRecord.countDocuments({ gameType });

  res.json({
    success: true,
    data: {
      history,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    }
  });
}));

// Get recent results for specific game type
router.get('/results/:gameType', catchAsync(async (req: Request, res: Response) => {
  const { gameType } = req.params;
  const { limit = 20 } = req.query;
  
  const results = await PeriodGame.getRecentResults(gameType, parseInt(limit as string));
  
  res.json({
    success: true,
    data: {
      results,
      gameType
    }
  });
}));

// Get game statistics
router.get('/stats/:gameType', catchAsync(async (req: Request, res: Response) => {
  const { gameType } = req.params;
  const { days = 7 } = req.query;
  
  const [gameStats, resultStats] = await Promise.all([
    GameRecord.getGameStats(gameType, parseInt(days as string)),
    PeriodGame.getResultStats(gameType, parseInt(days as string))
  ]);

  res.json({
    success: true,
    data: {
      gameStats,
      resultStats,
      period: `${days} days`
    }
  });
}));

// Get user's betting history
router.get('/my-bets', 
  authMiddleware,
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { 
      gameType, 
      status, 
      limit = 50, 
      page = 1,
      sortBy = 'placedAt',
      sortOrder = 'desc'
    } = req.query;

    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (parseInt(page as string) - 1) * limitNum;

    const bets = await Bet.getBetHistory(userId, {
      gameType: gameType as string,
      status: status as string,
      limit: limitNum,
      skip,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    const totalCount = await Bet.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        bets,
        pagination: {
          page: parseInt(page as string),
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum)
        }
      }
    });
  })
);

// Get user's betting statistics
router.get('/my-stats', 
  authMiddleware,
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { gameType, days } = req.query;

    const [betStats, winStreaks, userStats] = await Promise.all([
      Bet.getUserBetStats(userId, gameType as string, days ? parseInt(days as string) : undefined),
      Bet.getWinStreaks(userId, gameType as string),
      gameEngine.getUserStats(userId)
    ]);

    res.json({
      success: true,
      data: {
        betStats,
        winStreaks,
        userStats,
        period: days ? `${days} days` : 'all time'
      }
    });
  })
);

// Get live leaderboard
router.get('/leaderboard', catchAsync(async (req: Request, res: Response) => {
  const { gameType, period = 'daily', limit = 10 } = req.query;
  
  let fromDate = new Date();
  switch (period) {
    case 'daily':
      fromDate.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      fromDate.setDate(fromDate.getDate() - 7);
      break;
    case 'monthly':
      fromDate.setMonth(fromDate.getMonth() - 1);
      break;
  }

  const matchQuery: any = {
    placedAt: { $gte: fromDate },
    status: 'won'
  };
  
  if (gameType) {
    matchQuery.gameType = gameType;
  }

  const leaderboard = await Bet.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$userId',
        totalWinnings: { $sum: '$payout' },
        totalBets: { $sum: 1 },
        biggestWin: { $max: '$payout' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        username: '$user.username',
        avatar: '$user.avatar',
        totalWinnings: 1,
        totalBets: 1,
        biggestWin: 1
      }
    },
    {
      $sort: { totalWinnings: -1 }
    },
    {
      $limit: parseInt(limit as string)
    }
  ]);

  res.json({
    success: true,
    data: {
      leaderboard,
      period: period as string,
      gameType: gameType || 'all'
    }
  });
}));

// Get current game trends and hot/cold analysis
router.get('/trends/:gameType', catchAsync(async (req: Request, res: Response) => {
  const { gameType } = req.params;
  const { limit = 100 } = req.query;

  const recentResults = await PeriodGame.find({ gameType })
    .sort({ periodNumber: -1 })
    .limit(parseInt(limit as string))
    .select('result periodNumber timestamp')
    .lean();

  // Analyze trends based on game type
  let trendAnalysis: any = {};

  switch (gameType) {
    case 'dragon-tiger':
      trendAnalysis = analyzeDragonTigerTrends(recentResults);
      break;
    case 'roulette':
      trendAnalysis = analyzeRouletteTrends(recentResults);
      break;
    case 'lucky7':
      trendAnalysis = analyzeLucky7Trends(recentResults);
      break;
    case 'blackjack':
    case 'live-blackjack':
      trendAnalysis = analyzeBlackjackTrends(recentResults);
      break;
    default:
      trendAnalysis = { message: 'Trend analysis not available for this game type' };
  }

  res.json({
    success: true,
    data: {
      trends: trendAnalysis,
      recentResults: recentResults.slice(0, 20), // Last 20 results
      gameType
    }
  });
}));

// Verify game fairness
router.get('/verify/:periodId', catchAsync(async (req: Request, res: Response) => {
  const { periodId } = req.params;
  
  const gameRecord = await GameRecord.findOne({ periodId });
  
  if (!gameRecord) {
    return res.status(404).json({
      success: false,
      message: 'Game record not found'
    });
  }

  // Verify the game result using the fairness proof
  await gameRecord.verifyResult();

  res.json({
    success: true,
    data: {
      periodId,
      result: gameRecord.result,
      fairnessProof: gameRecord.fairnessProof,
      isVerified: gameRecord.isVerified,
      timestamp: gameRecord.endTime
    }
  });
}));

// Admin routes (protected)
router.use('/admin', authMiddleware);

// Force end a period (admin only)
router.post('/admin/force-end/:periodId', 
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    // Check if user is admin
    if (req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { periodId } = req.params;
    const { reason } = req.body;

    await gameEngine.forceEndPeriod(periodId, reason || 'Admin intervention');

    res.json({
      success: true,
      message: 'Period ended successfully',
      data: { periodId, reason }
    });
  })
);

// Get detailed analytics (admin only)
router.get('/admin/analytics/:gameType', 
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { gameType } = req.params;
    const { days = 30 } = req.query;

    const analytics = await getDetailedAnalytics(gameType, parseInt(days as string));

    res.json({
      success: true,
      data: analytics
    });
  })
);

// Utility functions for trend analysis
function analyzeDragonTigerTrends(results: any[]) {
  const winners = results.map(r => r.result.winner);
  const dragonCount = winners.filter(w => w === 'dragon').length;
  const tigerCount = winners.filter(w => w === 'tiger').length;
  const tieCount = winners.filter(w => w === 'tie').length;
  
  // Find streaks
  let currentStreak = { type: winners[0], count: 1 };
  let longestStreak = { type: winners[0], count: 1 };
  
  for (let i = 1; i < winners.length; i++) {
    if (winners[i] === currentStreak.type) {
      currentStreak.count++;
    } else {
      if (currentStreak.count > longestStreak.count) {
        longestStreak = { ...currentStreak };
      }
      currentStreak = { type: winners[i], count: 1 };
    }
  }

  return {
    distribution: {
      dragon: { count: dragonCount, percentage: (dragonCount / results.length * 100).toFixed(1) },
      tiger: { count: tigerCount, percentage: (tigerCount / results.length * 100).toFixed(1) },
      tie: { count: tieCount, percentage: (tieCount / results.length * 100).toFixed(1) }
    },
    currentStreak,
    longestStreak,
    totalGames: results.length,
    hotNumbers: [], // Not applicable for Dragon Tiger
    coldNumbers: [] // Not applicable for Dragon Tiger
  };
}

function analyzeRouletteTrends(results: any[]) {
  const numbers = results.map(r => r.result.number);
  const colors = results.map(r => r.result.color);
  
  // Count number frequencies
  const numberFreq: { [key: number]: number } = {};
  numbers.forEach(num => {
    numberFreq[num] = (numberFreq[num] || 0) + 1;
  });
  
  // Sort by frequency
  const sortedNumbers = Object.entries(numberFreq)
    .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }))
    .sort((a, b) => b.frequency - a.frequency);
  
  // Color distribution
  const redCount = colors.filter(c => c === 'red').length;
  const blackCount = colors.filter(c => c === 'black').length;
  const greenCount = colors.filter(c => c === 'green').length;

  return {
    distribution: {
      red: { count: redCount, percentage: (redCount / results.length * 100).toFixed(1) },
      black: { count: blackCount, percentage: (blackCount / results.length * 100).toFixed(1) },
      green: { count: greenCount, percentage: (greenCount / results.length * 100).toFixed(1) }
    },
    hotNumbers: sortedNumbers.slice(0, 5),
    coldNumbers: sortedNumbers.slice(-5),
    totalGames: results.length,
    numberFrequencies: numberFreq
  };
}

function analyzeLucky7Trends(results: any[]) {
  const outcomes = results.map(r => r.result.result);
  const totals = results.map(r => r.result.total);
  
  const under7Count = outcomes.filter(o => o === 'under7').length;
  const lucky7Count = outcomes.filter(o => o === 'lucky7').length;
  const over7Count = outcomes.filter(o => o === 'over7').length;
  
  const avgTotal = totals.reduce((sum, total) => sum + total, 0) / totals.length;

  return {
    distribution: {
      under7: { count: under7Count, percentage: (under7Count / results.length * 100).toFixed(1) },
      lucky7: { count: lucky7Count, percentage: (lucky7Count / results.length * 100).toFixed(1) },
      over7: { count: over7Count, percentage: (over7Count / results.length * 100).toFixed(1) }
    },
    averageTotal: avgTotal.toFixed(2),
    totalGames: results.length
  };
}

function analyzeBlackjackTrends(results: any[]) {
  const winners = results.map(r => r.result.winner);
  const playerCount = winners.filter(w => w === 'player').length;
  const dealerCount = winners.filter(w => w === 'dealer').length;
  const tieCount = winners.filter(w => w === 'tie').length;

  return {
    distribution: {
      player: { count: playerCount, percentage: (playerCount / results.length * 100).toFixed(1) },
      dealer: { count: dealerCount, percentage: (dealerCount / results.length * 100).toFixed(1) },
      tie: { count: tieCount, percentage: (tieCount / results.length * 100).toFixed(1) }
    },
    totalGames: results.length
  };
}

async function getDetailedAnalytics(gameType: string, days: number) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const [gameStats, revenueData, playerData] = await Promise.all([
    GameRecord.aggregate([
      {
        $match: {
          gameType,
          endTime: { $gte: fromDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$endTime' } }
          },
          games: { $sum: 1 },
          totalBets: { $sum: '$totalBets' },
          totalPayout: { $sum: '$totalPayout' },
          profit: { $sum: '$profitLoss' },
          players: { $sum: '$playersCount' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]),
    
    Bet.aggregate([
      {
        $match: {
          gameType,
          placedAt: { $gte: fromDate }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$placedAt' }
          },
          bets: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.hour': 1 } }
    ]),
    
    Bet.aggregate([
      {
        $match: {
          gameType,
          placedAt: { $gte: fromDate }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalBets: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalWinnings: { $sum: '$payout' }
        }
      },
      {
        $group: {
          _id: null,
          uniquePlayers: { $sum: 1 },
          avgBetsPerPlayer: { $avg: '$totalBets' },
          avgAmountPerPlayer: { $avg: '$totalAmount' }
        }
      }
    ])
  ]);

  return {
    dailyStats: gameStats,
    hourlyActivity: revenueData,
    playerMetrics: playerData[0] || {},
    period: `${days} days`
  };
}

export default router;