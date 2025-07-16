import crypto from 'crypto';
import { EventEmitter } from 'events';
import { User } from '../models/User.js';
import { Game } from '../models/Game.js';
import { GameResult } from '../models/GameResult.js';
import { Bet } from '../models/Bet.js';
import { Transaction } from '../models/Transaction.js';
import { GameRecord } from '../models/GameRecord.js';
import { PeriodGame } from '../models/PeriodGame.js';

interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
  value: number;
  displayValue: string;
}

interface GamePeriod {
  id: string;
  gameType: string;
  periodNumber: number;
  duration: number; // in seconds
  startTime: Date;
  endTime: Date;
  status: 'waiting' | 'betting' | 'playing' | 'completed';
  result?: any;
  totalBets: number;
  totalPayout: number;
  players: Map<string, PeriodPlayer>;
}

interface PeriodPlayer {
  userId: string;
  bets: PeriodBet[];
  totalBetAmount: number;
  totalWinnings: number;
  joinedAt: Date;
}

interface PeriodBet {
  id: string;
  userId: string;
  gameType: string;
  periodId: string;
  betType: string;
  amount: number;
  selection: any;
  odds: number;
  status: 'pending' | 'won' | 'lost';
  payout?: number;
  placedAt: Date;
}

interface AIDealer {
  id: string;
  name: string;
  avatar: string;
  personality: 'friendly' | 'professional' | 'witty' | 'serious';
  hand?: Card[];
  actions: string[];
}

export class AdvancedGameEngine extends EventEmitter {
  private activePeriods: Map<string, GamePeriod> = new Map();
  private gameTimers: Map<string, NodeJS.Timeout> = new Map();
  private aiDealers: Map<string, AIDealer> = new Map();
  private deck: Card[] = [];

  // Period durations in seconds
  private readonly PERIOD_DURATIONS = {
    '30s': 30,
    '1m': 60,
    '3m': 180,
    '5m': 300
  };

  constructor() {
    super();
    this.initializeAIDealers();
    this.startPeriodGames();
    console.log('🎰 Advanced Game Engine initialized with period-based games');
  }

  private initializeAIDealers(): void {
    const dealers = [
      { id: 'dealer1', name: 'Sophia', avatar: '👩‍💼', personality: 'friendly' as const },
      { id: 'dealer2', name: 'Marcus', avatar: '👨‍💼', personality: 'professional' as const },
      { id: 'dealer3', name: 'Luna', avatar: '👩‍🎓', personality: 'witty' as const },
      { id: 'dealer4', name: 'Viktor', avatar: '👨‍🎓', personality: 'serious' as const }
    ];

    dealers.forEach(dealer => {
      this.aiDealers.set(dealer.id, {
        ...dealer,
        actions: []
      });
    });
  }

  private createDeck(): Card[] {
    const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        let value = 0;
        if (rank === 'A') value = 11; // Ace can be 1 or 11 in blackjack
        else if (['J', 'Q', 'K'].includes(rank)) value = 10;
        else value = parseInt(rank);

        deck.push({
          suit,
          rank,
          value,
          displayValue: `${rank}${this.getSuitSymbol(suit)}`
        });
      }
    }

    return this.shuffleDeck(deck);
  }

  private getSuitSymbol(suit: Card['suit']): string {
    const symbols = {
      hearts: '♥️',
      diamonds: '♦️',
      clubs: '♣️',
      spades: '♠️'
    };
    return symbols[suit];
  }

  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Start all period-based games
  private startPeriodGames(): void {
    const gameTypes = [
      'blackjack', 'dragon-tiger', 'lucky7', 'roulette',
      'three-card-poker', 'four-card-poker', 'caribbean-stud',
      'texas-holdem', 'live-blackjack'
    ];

    const periods = ['30s', '1m', '3m', '5m'];

    gameTypes.forEach(gameType => {
      periods.forEach(period => {
        this.startNewPeriod(gameType, period);
      });
    });
  }

  // Start a new game period
  private startNewPeriod(gameType: string, periodType: string): void {
    const duration = this.PERIOD_DURATIONS[periodType as keyof typeof this.PERIOD_DURATIONS];
    const periodId = `${gameType}-${periodType}-${Date.now()}`;
    
    const period: GamePeriod = {
      id: periodId,
      gameType,
      periodNumber: this.getNextPeriodNumber(gameType, periodType),
      duration,
      startTime: new Date(),
      endTime: new Date(Date.now() + duration * 1000),
      status: 'betting',
      totalBets: 0,
      totalPayout: 0,
      players: new Map()
    };

    this.activePeriods.set(periodId, period);

    // Set timer for period end
    const timer = setTimeout(() => {
      this.endPeriod(periodId);
    }, duration * 1000);

    this.gameTimers.set(periodId, timer);

    this.emit('periodStarted', {
      periodId,
      gameType,
      periodType,
      duration,
      startTime: period.startTime,
      endTime: period.endTime
    });

    console.log(`🎮 Started new ${gameType} period (${periodType}) - ID: ${periodId}`);
  }

  // Place bet in period game
  async placePeriodBet(
    userId: string,
    gameType: string,
    periodType: string,
    betType: string,
    amount: number,
    selection: any
  ): Promise<{ success: boolean; bet?: PeriodBet; message: string }> {
    try {
      // Find active period
      const activePeriod = Array.from(this.activePeriods.values())
        .find(p => p.gameType === gameType && p.status === 'betting');

      if (!activePeriod) {
        return { success: false, message: 'No active betting period for this game' };
      }

      // Validate user and balance
      const user = await User.findById(userId);
      if (!user || user.balance < amount) {
        return { success: false, message: 'Insufficient balance' };
      }

      // Calculate odds based on game type and bet type
      const odds = this.calculateOdds(gameType, betType, selection);

      // Create bet
      const bet: PeriodBet = {
        id: crypto.randomUUID(),
        userId,
        gameType,
        periodId: activePeriod.id,
        betType,
        amount,
        selection,
        odds,
        status: 'pending',
        placedAt: new Date()
      };

      // Update user balance
      await User.findByIdAndUpdate(userId, {
        $inc: { balance: -amount }
      });

      // Add player to period if not exists
      if (!activePeriod.players.has(userId)) {
        activePeriod.players.set(userId, {
          userId,
          bets: [],
          totalBetAmount: 0,
          totalWinnings: 0,
          joinedAt: new Date()
        });
      }

      // Add bet to player
      const player = activePeriod.players.get(userId)!;
      player.bets.push(bet);
      player.totalBetAmount += amount;
      activePeriod.totalBets += amount;

      // Save bet to database
      const betRecord = new Bet({
        userId,
        gameId: activePeriod.id,
        gameType,
        amount,
        betType,
        selection,
        odds,
        status: 'pending',
        periodNumber: activePeriod.periodNumber
      });
      await betRecord.save();

      // Create transaction record
      await Transaction.create({
        userId,
        type: 'bet',
        amount: -amount,
        description: `${gameType} bet - ${betType}`,
        gameId: activePeriod.id,
        status: 'completed'
      });

      this.emit('betPlaced', {
        periodId: activePeriod.id,
        userId,
        bet,
        totalBets: activePeriod.totalBets
      });

      return { success: true, bet, message: 'Bet placed successfully' };

    } catch (error) {
      console.error('Error placing period bet:', error);
      return { success: false, message: 'Failed to place bet' };
    }
  }

  // Calculate odds based on game type and bet type
  private calculateOdds(gameType: string, betType: string, selection: any): number {
    const oddsTable: { [key: string]: { [key: string]: number } } = {
      'dragon-tiger': {
        'dragon': 1.95,
        'tiger': 1.95,
        'tie': 8.0
      },
      'lucky7': {
        'under7': 1.95,
        'lucky7': 4.5,
        'over7': 1.95
      },
      'roulette': {
        'red': 1.95,
        'black': 1.95,
        'even': 1.95,
        'odd': 1.95,
        'low': 1.95,
        'high': 1.95,
        'dozen': 2.9,
        'column': 2.9,
        'single': 35.0
      },
      'blackjack': {
        'player': 1.95,
        'dealer': 1.95,
        'tie': 8.0,
        'royal-match': 25.0,
        '21+3': 9.0
      },
      'three-card-poker': {
        'ante': 1.95,
        'pair-plus': 3.0
      },
      'four-card-poker': {
        'ante': 1.95,
        'aces-up': 2.0
      },
      'caribbean-stud': {
        'ante': 1.95,
        'progressive': 100.0
      },
      'texas-holdem': {
        'ante': 1.95,
        'bonus': 3.0
      }
    };

    return oddsTable[gameType]?.[betType] || 1.95;
  }

  // End game period and calculate results
  private async endPeriod(periodId: string): Promise<void> {
    const period = this.activePeriods.get(periodId);
    if (!period) return;

    period.status = 'playing';
    
    try {
      // Generate game result based on game type
      const result = await this.generatePeriodResult(period.gameType);
      period.result = result;

      // Process all bets
      await this.processPeriodBets(period);

      period.status = 'completed';

      // Save period result to database
      await this.savePeriodResult(period);

      // Emit period completed event
      this.emit('periodCompleted', {
        periodId,
        gameType: period.gameType,
        result,
        totalBets: period.totalBets,
        totalPayout: period.totalPayout,
        playersCount: period.players.size
      });

      // Start next period
      const periodType = this.extractPeriodType(periodId);
      setTimeout(() => {
        this.startNewPeriod(period.gameType, periodType);
      }, 5000); // 5 second break between periods

    } catch (error) {
      console.error('Error ending period:', error);
    } finally {
      // Clean up
      this.activePeriods.delete(periodId);
      const timer = this.gameTimers.get(periodId);
      if (timer) {
        clearTimeout(timer);
        this.gameTimers.delete(periodId);
      }
    }
  }

  // Generate result for different game types
  private async generatePeriodResult(gameType: string): Promise<any> {
    const seed = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(seed + Date.now()).digest('hex');

    switch (gameType) {
      case 'dragon-tiger':
        return this.generateDragonTigerResult(hash);
      
      case 'lucky7':
        return this.generateLucky7Result(hash);
      
      case 'roulette':
        return this.generateRouletteResult(hash);
      
      case 'blackjack':
      case 'live-blackjack':
        return this.generateBlackjackResult(hash);
      
      case 'three-card-poker':
        return this.generateThreeCardPokerResult(hash);
      
      case 'four-card-poker':
        return this.generateFourCardPokerResult(hash);
      
      case 'caribbean-stud':
        return this.generateCaribbeanStudResult(hash);
      
      case 'texas-holdem':
        return this.generateTexasHoldemResult(hash);
      
      default:
        throw new Error(`Unsupported game type: ${gameType}`);
    }
  }

  // Dragon vs Tiger result generation
  private generateDragonTigerResult(hash: string): any {
    this.deck = this.createDeck();
    const dragonCard = this.deck.pop()!;
    const tigerCard = this.deck.pop()!;
    
    let winner = 'tie';
    if (dragonCard.value > tigerCard.value) winner = 'dragon';
    else if (tigerCard.value > dragonCard.value) winner = 'tiger';

    return {
      dragonCard,
      tigerCard,
      winner,
      hash: hash.slice(0, 16)
    };
  }

  // Lucky 7 result generation
  private generateLucky7Result(hash: string): any {
    this.deck = this.createDeck();
    const card1 = this.deck.pop()!;
    const card2 = this.deck.pop()!;
    const total = card1.value + card2.value;
    
    let result = 'over7';
    if (total < 7) result = 'under7';
    else if (total === 7) result = 'lucky7';

    return {
      cards: [card1, card2],
      total,
      result,
      hash: hash.slice(0, 16)
    };
  }

  // Roulette result generation
  private generateRouletteResult(hash: string): any {
    const number = parseInt(hash.slice(0, 8), 16) % 37; // 0-36
    const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(number);
    const isBlack = number !== 0 && !isRed;
    
    return {
      number,
      color: number === 0 ? 'green' : (isRed ? 'red' : 'black'),
      isEven: number !== 0 && number % 2 === 0,
      isOdd: number !== 0 && number % 2 === 1,
      isLow: number >= 1 && number <= 18,
      isHigh: number >= 19 && number <= 36,
      dozen: number === 0 ? 0 : Math.ceil(number / 12),
      column: number === 0 ? 0 : ((number - 1) % 3) + 1,
      hash: hash.slice(0, 16)
    };
  }

  // Blackjack result generation with AI dealer
  private generateBlackjackResult(hash: string): any {
    this.deck = this.createDeck();
    const dealer = Array.from(this.aiDealers.values())[0]; // Get first AI dealer

    // Deal cards
    const playerCards = [this.deck.pop()!, this.deck.pop()!];
    const dealerCards = [this.deck.pop()!, this.deck.pop()!];

    let playerTotal = this.calculateBlackjackTotal(playerCards);
    let dealerTotal = this.calculateBlackjackTotal(dealerCards);

    // Player logic (simplified)
    while (playerTotal < 17) {
      playerCards.push(this.deck.pop()!);
      playerTotal = this.calculateBlackjackTotal(playerCards);
    }

    // Dealer logic
    while (dealerTotal < 17) {
      dealerCards.push(this.deck.pop()!);
      dealerTotal = this.calculateBlackjackTotal(dealerCards);
    }

    // Determine winner
    let winner = 'tie';
    if (playerTotal > 21) winner = 'dealer';
    else if (dealerTotal > 21) winner = 'player';
    else if (playerTotal > dealerTotal) winner = 'player';
    else if (dealerTotal > playerTotal) winner = 'dealer';

    // Check for side bets
    const royalMatch = this.checkRoyalMatch(playerCards);
    const twentyOnePlusThree = this.checkTwentyOnePlusThree(playerCards, dealerCards[0]);

    return {
      playerCards,
      dealerCards,
      playerTotal,
      dealerTotal,
      winner,
      sideBets: {
        royalMatch,
        twentyOnePlusThree
      },
      dealer: {
        name: dealer.name,
        avatar: dealer.avatar,
        message: this.getDealerMessage(dealer.personality, winner)
      },
      hash: hash.slice(0, 16)
    };
  }

  // Calculate blackjack hand total
  private calculateBlackjackTotal(cards: Card[]): number {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
      if (card.rank === 'A') {
        aces++;
        total += 11;
      } else {
        total += card.value;
      }
    }

    // Adjust for aces
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    return total;
  }

  // Check Royal Match side bet
  private checkRoyalMatch(cards: Card[]): { hit: boolean; payout: number } {
    if (cards.length < 2) return { hit: false, payout: 0 };
    
    const [card1, card2] = cards;
    const sameSuit = card1.suit === card2.suit;
    const isRoyalMatch = sameSuit && 
      ((card1.rank === 'K' && card2.rank === 'Q') || 
       (card1.rank === 'Q' && card2.rank === 'K'));

    return {
      hit: sameSuit,
      payout: isRoyalMatch ? 25 : (sameSuit ? 3 : 0)
    };
  }

  // Check 21+3 side bet
  private checkTwentyOnePlusThree(playerCards: Card[], dealerCard: Card): { hit: boolean; payout: number } {
    if (playerCards.length < 2) return { hit: false, payout: 0 };

    const [card1, card2] = playerCards;
    const threeCards = [card1, card2, dealerCard];
    
    // Check for flush, straight, three of a kind, straight flush
    const isFlush = threeCards.every(card => card.suit === threeCards[0].suit);
    const ranks = threeCards.map(card => card.rank).sort();
    const isStraight = this.isStraight(ranks);
    const isThreeOfKind = ranks[0] === ranks[1] && ranks[1] === ranks[2];
    const isStraightFlush = isFlush && isStraight;

    let payout = 0;
    if (isStraightFlush) payout = 40;
    else if (isThreeOfKind) payout = 30;
    else if (isStraight) payout = 10;
    else if (isFlush) payout = 5;

    return {
      hit: payout > 0,
      payout
    };
  }

  // Check if three cards form a straight
  private isStraight(ranks: string[]): boolean {
    const rankValues: { [key: string]: number } = {
      'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };

    const values = ranks.map(rank => rankValues[rank]).sort((a, b) => a - b);
    return values[2] - values[0] === 2 && values[1] - values[0] === 1;
  }

  // Generate poker game results (simplified)
  private generateThreeCardPokerResult(hash: string): any {
    this.deck = this.createDeck();
    const playerCards = [this.deck.pop()!, this.deck.pop()!, this.deck.pop()!];
    const dealerCards = [this.deck.pop()!, this.deck.pop()!, this.deck.pop()!];

    const playerHand = this.evaluatePokerHand(playerCards);
    const dealerHand = this.evaluatePokerHand(dealerCards);

    return {
      playerCards,
      dealerCards,
      playerHand,
      dealerHand,
      winner: playerHand.rank > dealerHand.rank ? 'player' : 'dealer',
      hash: hash.slice(0, 16)
    };
  }

  private generateFourCardPokerResult(hash: string): any {
    this.deck = this.createDeck();
    const playerCards = [this.deck.pop()!, this.deck.pop()!, this.deck.pop()!, this.deck.pop()!];
    const dealerCards = [this.deck.pop()!, this.deck.pop()!, this.deck.pop()!, this.deck.pop()!];

    return {
      playerCards,
      dealerCards,
      winner: Math.random() > 0.5 ? 'player' : 'dealer',
      hash: hash.slice(0, 16)
    };
  }

  private generateCaribbeanStudResult(hash: string): any {
    this.deck = this.createDeck();
    const playerCards = Array.from({ length: 5 }, () => this.deck.pop()!);
    const dealerCards = Array.from({ length: 5 }, () => this.deck.pop()!);

    return {
      playerCards,
      dealerCards,
      winner: Math.random() > 0.5 ? 'player' : 'dealer',
      hash: hash.slice(0, 16)
    };
  }

  private generateTexasHoldemResult(hash: string): any {
    this.deck = this.createDeck();
    const playerCards = [this.deck.pop()!, this.deck.pop()!];
    const communityCards = Array.from({ length: 5 }, () => this.deck.pop()!);
    const dealerCards = [this.deck.pop()!, this.deck.pop()!];

    return {
      playerCards,
      dealerCards,
      communityCards,
      winner: Math.random() > 0.5 ? 'player' : 'dealer',
      hash: hash.slice(0, 16)
    };
  }

  // Evaluate poker hand (simplified)
  private evaluatePokerHand(cards: Card[]): { name: string; rank: number } {
    // Simplified poker hand evaluation
    const ranks = cards.map(card => card.rank);
    const suits = cards.map(card => card.suit);
    
    const isFlush = suits.every(suit => suit === suits[0]);
    const rankCounts = ranks.reduce((acc, rank) => {
      acc[rank] = (acc[rank] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    
    if (isFlush) return { name: 'Flush', rank: 5 };
    if (counts[0] === 3) return { name: 'Three of a Kind', rank: 3 };
    if (counts[0] === 2 && counts[1] === 2) return { name: 'Two Pair', rank: 2 };
    if (counts[0] === 2) return { name: 'Pair', rank: 1 };
    
    return { name: 'High Card', rank: 0 };
  }

  // Process bets for completed period
  private async processPeriodBets(period: GamePeriod): Promise<void> {
    for (const [userId, player] of period.players) {
      for (const bet of player.bets) {
        const isWin = this.checkBetWin(bet, period.result);
        const payout = isWin ? bet.amount * bet.odds : 0;
        
        bet.status = isWin ? 'won' : 'lost';
        bet.payout = payout;
        
        if (isWin) {
          // Update user balance
          await User.findByIdAndUpdate(userId, {
            $inc: { 
              balance: payout,
              totalWinnings: payout,
              gamesWon: 1
            }
          });

          // Create winning transaction
          await Transaction.create({
            userId,
            type: 'win',
            amount: payout,
            description: `${period.gameType} win - ${bet.betType}`,
            gameId: period.id,
            status: 'completed'
          });

          player.totalWinnings += payout;
          period.totalPayout += payout;
        }

        // Update bet record in database
        await Bet.findOneAndUpdate(
          { userId, gameId: period.id, betType: bet.betType },
          {
            status: bet.status,
            payout,
            result: period.result
          }
        );

        // Update user stats
        await User.findByIdAndUpdate(userId, {
          $inc: { gamesPlayed: 1 }
        });
      }
    }
  }

  // Check if bet wins based on result
  private checkBetWin(bet: PeriodBet, result: any): boolean {
    switch (bet.gameType) {
      case 'dragon-tiger':
        return bet.selection === result.winner;
      
      case 'lucky7':
        return bet.selection === result.result;
      
      case 'roulette':
        return this.checkRouletteBetWin(bet, result);
      
      case 'blackjack':
      case 'live-blackjack':
        return this.checkBlackjackBetWin(bet, result);
      
      default:
        return bet.selection === result.winner;
    }
  }

  private checkRouletteBetWin(bet: PeriodBet, result: any): boolean {
    switch (bet.betType) {
      case 'red': return result.color === 'red';
      case 'black': return result.color === 'black';
      case 'even': return result.isEven;
      case 'odd': return result.isOdd;
      case 'low': return result.isLow;
      case 'high': return result.isHigh;
      case 'single': return bet.selection === result.number;
      case 'dozen': return bet.selection === result.dozen;
      case 'column': return bet.selection === result.column;
      default: return false;
    }
  }

  private checkBlackjackBetWin(bet: PeriodBet, result: any): boolean {
    switch (bet.betType) {
      case 'player': return result.winner === 'player';
      case 'dealer': return result.winner === 'dealer';
      case 'tie': return result.winner === 'tie';
      case 'royal-match': return result.sideBets.royalMatch.hit;
      case '21+3': return result.sideBets.twentyOnePlusThree.hit;
      default: return false;
    }
  }

  // Save period result to database
  private async savePeriodResult(period: GamePeriod): Promise<void> {
    const gameRecord = new GameRecord({
      gameType: period.gameType,
      periodId: period.id,
      periodNumber: period.periodNumber,
      startTime: period.startTime,
      endTime: period.endTime,
      result: period.result,
      totalBets: period.totalBets,
      totalPayout: period.totalPayout,
      playersCount: period.players.size,
      players: Array.from(period.players.values())
    });

    await gameRecord.save();

    // Also save to PeriodGame model
    const periodGame = new PeriodGame({
      gameType: period.gameType,
      periodNumber: period.periodNumber,
      result: period.result,
      timestamp: period.endTime
    });

    await periodGame.save();
  }

  // Get dealer message based on personality and result
  private getDealerMessage(personality: AIDealer['personality'], winner: string): string {
    const messages = {
      friendly: {
        player: "Congratulations! You played that hand perfectly! 🎉",
        dealer: "Better luck next time! The cards just weren't in your favor today. 😊",
        tie: "What an exciting tie! Great game everyone! 🤝"
      },
      professional: {
        player: "Excellent play. Your strategy paid off this round.",
        dealer: "The house takes this one. Thank you for playing.",
        tie: "A tie result. The next hand awaits."
      },
      witty: {
        player: "Well well, looks like someone's been practicing! Nice win! 😎",
        dealer: "Ouch! The cards were feeling generous to the house today! 😅",
        tie: "Nobody wins, nobody loses. How very diplomatic of these cards! 🎭"
      },
      serious: {
        player: "Victory achieved through skillful play.",
        dealer: "The mathematical probability favored the house this round.",
        tie: "An equal outcome. Statistical anomaly resolved."
      }
    };

    return messages[personality][winner as keyof typeof messages[personality]];
  }

  // Utility methods
  private getNextPeriodNumber(gameType: string, periodType: string): number {
    // This would typically query the database for the last period number
    return Date.now() % 100000; // Simplified
  }

  private extractPeriodType(periodId: string): string {
    const parts = periodId.split('-');
    return parts[1]; // e.g., "30s", "1m", "3m", "5m"
  }

  // Public API methods
  async getActivePeriods(gameType?: string): Promise<any[]> {
    let periods = Array.from(this.activePeriods.values());
    
    if (gameType) {
      periods = periods.filter(p => p.gameType === gameType);
    }

    return periods.map(period => ({
      id: period.id,
      gameType: period.gameType,
      periodNumber: period.periodNumber,
      status: period.status,
      startTime: period.startTime,
      endTime: period.endTime,
      timeRemaining: Math.max(0, period.endTime.getTime() - Date.now()),
      totalBets: period.totalBets,
      playersCount: period.players.size
    }));
  }

  async getGameHistory(
    gameType: string,
    limit: number = 50
  ): Promise<any[]> {
    const records = await GameRecord.find({ gameType })
      .sort({ endTime: -1 })
      .limit(limit)
      .lean();

    return records;
  }

  async getUserGameHistory(
    userId: string,
    gameType?: string,
    limit: number = 50
  ): Promise<any[]> {
    const filter: any = { userId };
    if (gameType) filter.gameType = gameType;

    const bets = await Bet.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('gameId')
      .lean();

    return bets;
  }

  async getUserStats(userId: string): Promise<any> {
    const stats = await User.findById(userId).select('gamesPlayed gamesWon totalWinnings balance');
    
    const totalBets = await Bet.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const winRate = stats?.gamesPlayed ? (stats.gamesWon / stats.gamesPlayed * 100) : 0;

    return {
      gamesPlayed: stats?.gamesPlayed || 0,
      gamesWon: stats?.gamesWon || 0,
      winRate: parseFloat(winRate.toFixed(2)),
      totalBets: totalBets[0]?.total || 0,
      totalWinnings: stats?.totalWinnings || 0,
      currentBalance: stats?.balance || 0,
      profitLoss: (stats?.totalWinnings || 0) - (totalBets[0]?.total || 0)
    };
  }

  // Force end period (admin function)
  async forceEndPeriod(periodId: string, reason: string): Promise<void> {
    const period = this.activePeriods.get(periodId);
    if (!period) return;

    // Refund all pending bets
    for (const [userId, player] of period.players) {
      for (const bet of player.bets) {
        if (bet.status === 'pending') {
          await User.findByIdAndUpdate(userId, {
            $inc: { balance: bet.amount }
          });

          await Transaction.create({
            userId,
            type: 'refund',
            amount: bet.amount,
            description: `Period ${periodId} cancelled: ${reason}`,
            status: 'completed'
          });
        }
      }
    }

    period.status = 'completed';
    this.emit('periodForceEnded', { periodId, reason });
    
    // Clean up
    this.activePeriods.delete(periodId);
    const timer = this.gameTimers.get(periodId);
    if (timer) {
      clearTimeout(timer);
      this.gameTimers.delete(periodId);
    }
  }
}