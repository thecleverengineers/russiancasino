import crypto from 'crypto';
import { EventEmitter } from 'events';
import { User } from '../models/User.js';
import { Game } from '../models/Game.js';
import { Bet } from '../models/Bet.js';
import { Transaction } from '../models/Transaction.js';

interface GamePlayer {
  userId: string;
  socketId: string;
  balance: number;
  currentBet?: number;
  choice?: any;
  isReady: boolean;
}

interface GameState {
  id: string;
  type: 'toss' | 'raffle' | 'slots' | 'poker' | 'blackjack' | 'roulette';
  status: 'waiting' | 'betting' | 'playing' | 'finished';
  players: Map<string, GamePlayer>;
  maxPlayers: number;
  minBet: number;
  maxBet: number;
  currentRound: number;
  totalPot: number;
  winner?: string;
  result?: any;
  startTime?: Date;
  endTime?: Date;
  seed?: string;
  fairnessProof?: string;
}

interface BetResult {
  success: boolean;
  betId?: string;
  newBalance?: number;
  message: string;
  multiplier?: number;
  winnings?: number;
}

export class GameEngine extends EventEmitter {
  private games: Map<string, GameState> = new Map();
  private gameTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.initializeGameTypes();
  }

  private initializeGameTypes(): void {
    // Initialize different game configurations
    console.log('🎮 Game Engine initialized with multiple game types');
  }

  // Create a new game
  async createGame(
    type: GameState['type'],
    options: {
      maxPlayers?: number;
      minBet?: number;
      maxBet?: number;
      duration?: number;
    } = {}
  ): Promise<string> {
    const gameId = crypto.randomUUID();
    const seed = this.generateProvablySeed();

    const gameState: GameState = {
      id: gameId,
      type,
      status: 'waiting',
      players: new Map(),
      maxPlayers: options.maxPlayers || 10,
      minBet: options.minBet || 10,
      maxBet: options.maxBet || 1000,
      currentRound: 1,
      totalPot: 0,
      seed,
      fairnessProof: this.generateFairnessProof(seed)
    };

    this.games.set(gameId, gameState);

    // Set up auto-start timer if specified
    if (options.duration) {
      const timer = setTimeout(() => {
        this.startGame(gameId);
      }, options.duration * 1000);
      
      this.gameTimers.set(gameId, timer);
    }

    this.emit('gameCreated', gameState);
    return gameId;
  }

  // Join a game
  async joinGame(userId: string, gameId: string, socketId?: string): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'waiting' && game.status !== 'betting') {
      throw new Error('Game has already started');
    }

    if (game.players.size >= game.maxPlayers) {
      throw new Error('Game is full');
    }

    if (game.players.has(userId)) {
      throw new Error('Already joined this game');
    }

    // Get user balance
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const player: GamePlayer = {
      userId,
      socketId: socketId || '',
      balance: user.balance || 0,
      isReady: false
    };

    game.players.set(userId, player);
    this.emit('playerJoined', { gameId, userId, playersCount: game.players.size });

    // Auto-start if enough players
    if (game.players.size >= 2 && game.type === 'toss') {
      this.startBettingPhase(gameId);
    }
  }

  // Place a bet
  async placeBet(
    userId: string,
    gameId: string,
    amount: number,
    choice: any
  ): Promise<BetResult> {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'betting') {
      throw new Error('Betting is not allowed at this time');
    }

    const player = game.players.get(userId);
    if (!player) {
      throw new Error('Player not in game');
    }

    if (amount < game.minBet || amount > game.maxBet) {
      throw new Error(`Bet must be between ${game.minBet} and ${game.maxBet}`);
    }

    if (player.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Validate choice based on game type
    if (!this.validateChoice(game.type, choice)) {
      throw new Error('Invalid choice for this game type');
    }

    try {
      // Deduct amount from user balance
      await User.findByIdAndUpdate(userId, {
        $inc: { balance: -amount }
      });

      // Create bet record
      const bet = new Bet({
        userId,
        gameId,
        amount,
        choice,
        gameType: game.type,
        status: 'pending',
        seed: game.seed
      });

      await bet.save();

      // Update player state
      player.currentBet = amount;
      player.choice = choice;
      player.balance -= amount;
      player.isReady = true;

      // Update game pot
      game.totalPot += amount;

      this.emit('betPlaced', {
        gameId,
        userId,
        amount,
        choice,
        totalPot: game.totalPot
      });

      // Check if all players are ready
      const allReady = Array.from(game.players.values()).every(p => p.isReady);
      if (allReady || game.players.size >= game.maxPlayers) {
        this.startGame(gameId);
      }

      return {
        success: true,
        betId: bet._id.toString(),
        newBalance: player.balance,
        message: 'Bet placed successfully'
      };

    } catch (error) {
      throw new Error('Failed to place bet: ' + (error as Error).message);
    }
  }

  // Start betting phase
  private startBettingPhase(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    game.status = 'betting';
    this.emit('bettingStarted', { gameId, duration: 30000 }); // 30 seconds betting time

    // Auto-start game after betting period
    const timer = setTimeout(() => {
      this.startGame(gameId);
    }, 30000);

    this.gameTimers.set(gameId + '_betting', timer);
  }

  // Start the actual game
  private async startGame(gameId: string): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) return;

    game.status = 'playing';
    game.startTime = new Date();

    // Clear any existing timers
    const timer = this.gameTimers.get(gameId + '_betting');
    if (timer) {
      clearTimeout(timer);
      this.gameTimers.delete(gameId + '_betting');
    }

    this.emit('gameStarted', { gameId });

    try {
      // Generate results based on game type
      const result = await this.generateGameResult(game);
      await this.processGameResult(game, result);
    } catch (error) {
      console.error('Error processing game:', error);
      this.emit('gameError', { gameId, error: (error as Error).message });
    }
  }

  // Generate provably fair results
  private async generateGameResult(game: GameState): Promise<any> {
    const combinedSeed = game.seed + game.players.size + Date.now();
    const hash = crypto.createHash('sha256').update(combinedSeed).digest('hex');

    switch (game.type) {
      case 'toss':
        return {
          result: parseInt(hash.slice(0, 8), 16) % 2 === 0 ? 'heads' : 'tails',
          hash,
          seed: combinedSeed
        };

      case 'raffle':
        const participants = Array.from(game.players.keys());
        const winnerIndex = parseInt(hash.slice(0, 8), 16) % participants.length;
        return {
          winner: participants[winnerIndex],
          hash,
          seed: combinedSeed
        };

      case 'slots':
        const symbols = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣'];
        const reels = [
          symbols[parseInt(hash.slice(0, 2), 16) % symbols.length],
          symbols[parseInt(hash.slice(2, 4), 16) % symbols.length],
          symbols[parseInt(hash.slice(4, 6), 16) % symbols.length]
        ];
        return {
          reels,
          isWin: reels[0] === reels[1] && reels[1] === reels[2],
          multiplier: this.calculateSlotsMultiplier(reels),
          hash,
          seed: combinedSeed
        };

      case 'roulette':
        const number = parseInt(hash.slice(0, 8), 16) % 37; // 0-36
        return {
          number,
          color: number === 0 ? 'green' : (number % 2 === 0 ? 'black' : 'red'),
          hash,
          seed: combinedSeed
        };

      default:
        throw new Error('Unsupported game type');
    }
  }

  // Process game results and distribute winnings
  private async processGameResult(game: GameState, result: any): Promise<void> {
    game.result = result;
    game.endTime = new Date();
    game.status = 'finished';

    const winners: { userId: string; winnings: number; multiplier: number }[] = [];

    // Process each player's bet
    for (const [userId, player] of game.players) {
      if (!player.currentBet || !player.choice) continue;

      const { isWinner, multiplier } = this.checkWin(game.type, player.choice, result);
      
      if (isWinner) {
        const winnings = player.currentBet * multiplier;
        winners.push({ userId, winnings, multiplier });

        // Update user balance
        await User.findByIdAndUpdate(userId, {
          $inc: { 
            balance: winnings,
            totalWinnings: winnings,
            gamesWon: 1
          }
        });

        // Create winning transaction
        await Transaction.create({
          userId,
          type: 'game_win',
          amount: winnings,
          description: `Won ${game.type} game`,
          gameId: game.id,
          status: 'completed'
        });
      }

      // Update bet record
      await Bet.findOneAndUpdate(
        { userId, gameId: game.id },
        {
          status: isWinner ? 'won' : 'lost',
          result,
          winnings: isWinner ? player.currentBet * multiplier : 0,
          multiplier: isWinner ? multiplier : 0
        }
      );

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { gamesPlayed: 1 }
      });
    }

    // Save game result
    await Game.create({
      gameId: game.id,
      type: game.type,
      players: Array.from(game.players.keys()),
      totalPot: game.totalPot,
      result,
      winners: winners.map(w => w.userId),
      startTime: game.startTime,
      endTime: game.endTime,
      seed: game.seed,
      fairnessProof: game.fairnessProof
    });

    this.emit('gameFinished', {
      gameId: game.id,
      result,
      winners,
      totalPot: game.totalPot
    });

    // Clean up
    this.cleanupGame(game.id);
  }

  // Check if a choice wins
  private checkWin(gameType: string, choice: any, result: any): { isWinner: boolean; multiplier: number } {
    switch (gameType) {
      case 'toss':
        return {
          isWinner: choice === result.result,
          multiplier: 1.95 // House edge of 2.5%
        };

      case 'raffle':
        return {
          isWinner: choice === result.winner,
          multiplier: 1.0 // Winner takes all minus house edge
        };

      case 'slots':
        return {
          isWinner: result.isWin,
          multiplier: result.multiplier
        };

      case 'roulette':
        // Handle different bet types
        if (typeof choice === 'number') {
          return {
            isWinner: choice === result.number,
            multiplier: 35 // Straight up bet
          };
        } else if (choice === result.color) {
          return {
            isWinner: true,
            multiplier: 1.95 // Color bet
          };
        }
        return { isWinner: false, multiplier: 0 };

      default:
        return { isWinner: false, multiplier: 0 };
    }
  }

  // Validate player choice based on game type
  private validateChoice(gameType: string, choice: any): boolean {
    switch (gameType) {
      case 'toss':
        return choice === 'heads' || choice === 'tails';
      
      case 'roulette':
        return (typeof choice === 'number' && choice >= 0 && choice <= 36) ||
               ['red', 'black'].includes(choice);
      
      case 'slots':
        return true; // No choice needed for slots
      
      default:
        return true;
    }
  }

  // Calculate slots multiplier based on symbols
  private calculateSlotsMultiplier(reels: string[]): number {
    if (reels[0] !== reels[1] || reels[1] !== reels[2]) return 0;

    const multipliers: { [key: string]: number } = {
      '🍒': 2,
      '🍋': 3,
      '🔔': 5,
      '⭐': 10,
      '💎': 25,
      '7️⃣': 100
    };

    return multipliers[reels[0]] || 0;
  }

  // Generate provably fair seed
  private generateProvablySeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate fairness proof
  private generateFairnessProof(seed: string): string {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  // Get game state
  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  // Get all active games
  getActiveGames(): GameState[] {
    return Array.from(this.games.values()).filter(g => g.status !== 'finished');
  }

  // Clean up finished games
  private cleanupGame(gameId: string): void {
    setTimeout(() => {
      this.games.delete(gameId);
      const timer = this.gameTimers.get(gameId);
      if (timer) {
        clearTimeout(timer);
        this.gameTimers.delete(gameId);
      }
    }, 60000); // Keep for 1 minute for result viewing
  }

  // Force end a game (admin function)
  async forceEndGame(gameId: string, reason: string): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) return;

    // Refund all bets
    for (const [userId, player] of game.players) {
      if (player.currentBet) {
        await User.findByIdAndUpdate(userId, {
          $inc: { balance: player.currentBet }
        });

        await Transaction.create({
          userId,
          type: 'refund',
          amount: player.currentBet,
          description: `Game ${gameId} cancelled: ${reason}`,
          status: 'completed'
        });
      }
    }

    game.status = 'finished';
    this.emit('gameForceEnded', { gameId, reason });
    this.cleanupGame(gameId);
  }
}