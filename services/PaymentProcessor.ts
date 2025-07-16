import Stripe from 'stripe';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { PaymentMethod } from '../models/PaymentMethod.js';
import { NotificationService } from './NotificationService.js';

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  paymentIntentId?: string;
  message: string;
  amount?: number;
  fee?: number;
}

interface WithdrawalRequest {
  userId: string;
  amount: number;
  method: 'bank' | 'upi' | 'crypto' | 'paypal';
  details: any;
}

export class PaymentProcessor {
  private stripe: Stripe;
  private razorpay: Razorpay;
  private notificationService: NotificationService;
  private ethProvider?: ethers.JsonRpcProvider;

  constructor() {
    // Initialize payment gateways
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16'
    });

    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || ''
    });

    this.notificationService = new NotificationService();

    // Initialize Ethereum provider for crypto payments
    if (process.env.ETHEREUM_RPC_URL) {
      this.ethProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    }

    console.log('💳 Payment Processor initialized with multiple gateways');
  }

  // Process deposit via Stripe
  async processStripeDeposit(
    userId: string,
    amount: number,
    currency: string = 'usd',
    paymentMethodId: string
  ): Promise<PaymentResult> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses cents
        currency: currency.toLowerCase(),
        payment_method: paymentMethodId,
        confirm: true,
        customer: user.stripeCustomerId || undefined,
        metadata: {
          userId,
          type: 'deposit',
          platform: 'gaming'
        },
        return_url: `${process.env.CLIENT_URL}/payment/success`
      });

      if (paymentIntent.status === 'succeeded') {
        // Update user balance
        await User.findByIdAndUpdate(userId, {
          $inc: { balance: amount }
        });

        // Create transaction record
        const transaction = await Transaction.create({
          userId,
          type: 'deposit',
          method: 'stripe',
          amount,
          currency,
          status: 'completed',
          externalId: paymentIntent.id,
          fee: (paymentIntent.charges.data[0]?.balance_transaction as any)?.fee || 0,
          description: 'Deposit via Stripe'
        });

        // Send notification
        await this.notificationService.sendNotification(userId, {
          type: 'deposit_success',
          title: 'Deposit Successful',
          message: `Your deposit of ${amount} ${currency.toUpperCase()} has been processed successfully.`,
          data: { transactionId: transaction._id, amount }
        });

        return {
          success: true,
          transactionId: transaction._id.toString(),
          paymentIntentId: paymentIntent.id,
          message: 'Deposit processed successfully',
          amount,
          fee: (paymentIntent.charges.data[0]?.balance_transaction as any)?.fee || 0
        };
      } else {
        throw new Error(`Payment failed with status: ${paymentIntent.status}`);
      }

    } catch (error) {
      console.error('Stripe deposit error:', error);
      return {
        success: false,
        message: `Deposit failed: ${(error as Error).message}`
      };
    }
  }

  // Process deposit via Razorpay
  async processRazorpayDeposit(
    userId: string,
    amount: number,
    currency: string = 'INR',
    orderId: string
  ): Promise<PaymentResult> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify payment with Razorpay
      const payment = await this.razorpay.payments.fetch(orderId);
      
      if (payment.status === 'captured') {
        const actualAmount = payment.amount / 100; // Razorpay uses paise

        // Update user balance
        await User.findByIdAndUpdate(userId, {
          $inc: { balance: actualAmount }
        });

        // Create transaction record
        const transaction = await Transaction.create({
          userId,
          type: 'deposit',
          method: 'razorpay',
          amount: actualAmount,
          currency,
          status: 'completed',
          externalId: payment.id,
          fee: payment.fee || 0,
          description: 'Deposit via Razorpay'
        });

        // Send notification
        await this.notificationService.sendNotification(userId, {
          type: 'deposit_success',
          title: 'Deposit Successful',
          message: `Your deposit of ₹${actualAmount} has been processed successfully.`,
          data: { transactionId: transaction._id, amount: actualAmount }
        });

        return {
          success: true,
          transactionId: transaction._id.toString(),
          message: 'Deposit processed successfully',
          amount: actualAmount,
          fee: payment.fee || 0
        };
      } else {
        throw new Error(`Payment not captured: ${payment.status}`);
      }

    } catch (error) {
      console.error('Razorpay deposit error:', error);
      return {
        success: false,
        message: `Deposit failed: ${(error as Error).message}`
      };
    }
  }

  // Process cryptocurrency deposit
  async processCryptoDeposit(
    userId: string,
    txHash: string,
    currency: 'BTC' | 'ETH' | 'USDT' = 'ETH'
  ): Promise<PaymentResult> {
    try {
      if (!this.ethProvider && currency === 'ETH') {
        throw new Error('Ethereum provider not configured');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify transaction on blockchain
      let amount = 0;
      let verified = false;

      if (currency === 'ETH' && this.ethProvider) {
        const tx = await this.ethProvider.getTransaction(txHash);
        if (tx && tx.to?.toLowerCase() === process.env.ETH_DEPOSIT_ADDRESS?.toLowerCase()) {
          amount = parseFloat(ethers.formatEther(tx.value));
          verified = true;
        }
      }

      if (!verified) {
        throw new Error('Transaction verification failed');
      }

      // Check if transaction already processed
      const existingTx = await Transaction.findOne({ externalId: txHash });
      if (existingTx) {
        throw new Error('Transaction already processed');
      }

      // Convert crypto to platform currency (e.g., USD)
      const usdAmount = await this.convertCryptoToUSD(amount, currency);

      // Update user balance
      await User.findByIdAndUpdate(userId, {
        $inc: { balance: usdAmount }
      });

      // Create transaction record
      const transaction = await Transaction.create({
        userId,
        type: 'deposit',
        method: 'crypto',
        amount: usdAmount,
        currency: 'USD',
        cryptoAmount: amount,
        cryptoCurrency: currency,
        status: 'completed',
        externalId: txHash,
        description: `Crypto deposit: ${amount} ${currency}`
      });

      // Send notification
      await this.notificationService.sendNotification(userId, {
        type: 'deposit_success',
        title: 'Crypto Deposit Successful',
        message: `Your crypto deposit of ${amount} ${currency} (≈$${usdAmount}) has been processed.`,
        data: { transactionId: transaction._id, amount: usdAmount, cryptoAmount: amount }
      });

      return {
        success: true,
        transactionId: transaction._id.toString(),
        message: 'Crypto deposit processed successfully',
        amount: usdAmount
      };

    } catch (error) {
      console.error('Crypto deposit error:', error);
      return {
        success: false,
        message: `Crypto deposit failed: ${(error as Error).message}`
      };
    }
  }

  // Process withdrawal request
  async processWithdrawal(request: WithdrawalRequest): Promise<PaymentResult> {
    try {
      const user = await User.findById(request.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check minimum withdrawal amount
      const minWithdrawal = 10;
      if (request.amount < minWithdrawal) {
        throw new Error(`Minimum withdrawal amount is $${minWithdrawal}`);
      }

      // Check user balance
      if (user.balance < request.amount) {
        throw new Error('Insufficient balance');
      }

      // Check daily withdrawal limits
      const dailyLimit = await this.checkDailyWithdrawalLimit(request.userId, request.amount);
      if (!dailyLimit.allowed) {
        throw new Error(`Daily withdrawal limit exceeded. Limit: $${dailyLimit.limit}, Used: $${dailyLimit.used}`);
      }

      // Calculate withdrawal fee
      const fee = this.calculateWithdrawalFee(request.amount, request.method);
      const netAmount = request.amount - fee;

      // Temporarily hold the amount
      await User.findByIdAndUpdate(request.userId, {
        $inc: { 
          balance: -request.amount,
          pendingWithdrawals: request.amount
        }
      });

      // Create pending transaction
      const transaction = await Transaction.create({
        userId: request.userId,
        type: 'withdrawal',
        method: request.method,
        amount: request.amount,
        netAmount,
        fee,
        status: 'pending',
        withdrawalDetails: request.details,
        description: `Withdrawal via ${request.method}`
      });

      // Process based on method
      let processed = false;
      let externalId = '';

      switch (request.method) {
        case 'bank':
          processed = await this.processBankWithdrawal(transaction._id.toString(), request.details);
          break;
        case 'upi':
          processed = await this.processUPIWithdrawal(transaction._id.toString(), request.details);
          break;
        case 'crypto':
          const cryptoResult = await this.processCryptoWithdrawal(transaction._id.toString(), request.details);
          processed = cryptoResult.success;
          externalId = cryptoResult.txHash || '';
          break;
        case 'paypal':
          processed = await this.processPayPalWithdrawal(transaction._id.toString(), request.details);
          break;
      }

      if (processed) {
        // Update transaction status
        await Transaction.findByIdAndUpdate(transaction._id, {
          status: 'completed',
          externalId,
          processedAt: new Date()
        });

        // Update user pending withdrawals
        await User.findByIdAndUpdate(request.userId, {
          $inc: { pendingWithdrawals: -request.amount }
        });

        // Send notification
        await this.notificationService.sendNotification(request.userId, {
          type: 'withdrawal_success',
          title: 'Withdrawal Processed',
          message: `Your withdrawal of $${netAmount} has been processed successfully.`,
          data: { transactionId: transaction._id, amount: netAmount }
        });

        return {
          success: true,
          transactionId: transaction._id.toString(),
          message: 'Withdrawal processed successfully',
          amount: netAmount,
          fee
        };
      } else {
        // Refund the amount if processing failed
        await User.findByIdAndUpdate(request.userId, {
          $inc: { 
            balance: request.amount,
            pendingWithdrawals: -request.amount
          }
        });

        await Transaction.findByIdAndUpdate(transaction._id, {
          status: 'failed',
          failureReason: 'Processing failed'
        });

        throw new Error('Withdrawal processing failed');
      }

    } catch (error) {
      console.error('Withdrawal error:', error);
      return {
        success: false,
        message: `Withdrawal failed: ${(error as Error).message}`
      };
    }
  }

  // Check daily withdrawal limits
  private async checkDailyWithdrawalLimit(
    userId: string,
    amount: number
  ): Promise<{ allowed: boolean; limit: number; used: number }> {
    const user = await User.findById(userId);
    const dailyLimit = user?.dailyWithdrawalLimit || 1000;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayWithdrawals = await Transaction.aggregate([
      {
        $match: {
          userId: userId,
          type: 'withdrawal',
          status: { $in: ['completed', 'pending'] },
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const usedToday = todayWithdrawals[0]?.total || 0;
    const remaining = dailyLimit - usedToday;

    return {
      allowed: amount <= remaining,
      limit: dailyLimit,
      used: usedToday
    };
  }

  // Calculate withdrawal fees
  private calculateWithdrawalFee(amount: number, method: string): number {
    const feeRates = {
      bank: 0.02, // 2%
      upi: 0.01,  // 1%
      crypto: 0.005, // 0.5%
      paypal: 0.025 // 2.5%
    };

    const rate = feeRates[method as keyof typeof feeRates] || 0.02;
    const fee = amount * rate;
    const minFee = 1;
    const maxFee = 25;

    return Math.min(Math.max(fee, minFee), maxFee);
  }

  // Mock bank withdrawal processing
  private async processBankWithdrawal(transactionId: string, details: any): Promise<boolean> {
    // Simulate bank API call
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock success rate of 95%
        resolve(Math.random() > 0.05);
      }, 2000);
    });
  }

  // Mock UPI withdrawal processing
  private async processUPIWithdrawal(transactionId: string, details: any): Promise<boolean> {
    // Simulate UPI API call
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock success rate of 98%
        resolve(Math.random() > 0.02);
      }, 1000);
    });
  }

  // Mock crypto withdrawal processing
  private async processCryptoWithdrawal(
    transactionId: string,
    details: any
  ): Promise<{ success: boolean; txHash?: string }> {
    // Simulate blockchain transaction
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.01; // 99% success rate
        resolve({
          success,
          txHash: success ? crypto.randomBytes(32).toString('hex') : undefined
        });
      }, 5000);
    });
  }

  // Mock PayPal withdrawal processing
  private async processPayPalWithdrawal(transactionId: string, details: any): Promise<boolean> {
    // Simulate PayPal API call
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock success rate of 97%
        resolve(Math.random() > 0.03);
      }, 3000);
    });
  }

  // Convert cryptocurrency to USD (mock implementation)
  private async convertCryptoToUSD(amount: number, currency: string): Promise<number> {
    // Mock exchange rates
    const rates = {
      BTC: 45000,
      ETH: 3000,
      USDT: 1
    };

    return amount * (rates[currency as keyof typeof rates] || 1);
  }

  // Get payment methods for user
  async getPaymentMethods(userId: string): Promise<any[]> {
    const paymentMethods = await PaymentMethod.find({ userId, isActive: true });
    return paymentMethods.map(pm => ({
      id: pm._id,
      type: pm.type,
      last4: pm.last4,
      brand: pm.brand,
      isDefault: pm.isDefault
    }));
  }

  // Add new payment method
  async addPaymentMethod(userId: string, methodData: any): Promise<PaymentResult> {
    try {
      const paymentMethod = new PaymentMethod({
        userId,
        ...methodData
      });

      await paymentMethod.save();

      return {
        success: true,
        message: 'Payment method added successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add payment method: ${(error as Error).message}`
      };
    }
  }

  // Get transaction history
  async getTransactionHistory(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      type?: string;
      status?: string;
    } = {}
  ): Promise<{ transactions: any[]; total: number; pages: number }> {
    const { page = 1, limit = 20, type, status } = options;
    const skip = (page - 1) * limit;

    const filter: any = { userId };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    return {
      transactions,
      total,
      pages: Math.ceil(total / limit)
    };
  }
}