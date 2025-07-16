import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createClient } from 'redis';
import winston from 'winston';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import routes
import userRoutes from './routes/user.js';
import gameRoutes from './routes/games.js';
import paymentRoutes from './routes/payment.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';

// Import middleware
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { socketAuth } from './middleware/socketAuth.js';

// Import services
import { NotificationService } from './services/NotificationService.js';
import { AdvancedGameEngine } from './services/AdvancedGameEngine.js';
import { PaymentProcessor } from './services/PaymentProcessor.js';
import { AnalyticsService } from './services/AnalyticsService.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CustomError extends Error {
  status?: number;
}

class AdvancedGamingServer {
  private app: Application;
  private server: any;
  private io: SocketIOServer;
  private redis: any;
  private logger: winston.Logger;
  private notificationService: NotificationService;
  private gameEngine: AdvancedGameEngine;
  private paymentProcessor: PaymentProcessor;
  private analyticsService: AnalyticsService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.setupLogger();
    this.initializeServices();
    this.setupRedis();
    this.setupSocketIO();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.connectDatabase();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'gaming-platform' },
      transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  private async setupRedis(): Promise<void> {
    try {
      this.redis = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redis.on('error', (err: Error) => {
        this.logger.error('Redis Client Error', err);
      });
      
      await this.redis.connect();
      this.logger.info('Redis connected successfully');
    } catch (error) {
      this.logger.error('Redis connection failed:', error);
    }
  }

  private initializeServices(): void {
    this.notificationService = new NotificationService();
    this.gameEngine = new AdvancedGameEngine();
    this.paymentProcessor = new PaymentProcessor();
    this.analyticsService = new AnalyticsService();
  }

  private setupSocketIO(): void {
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Socket authentication middleware
    this.io.use(socketAuth);

    this.io.on('connection', (socket) => {
      this.logger.info(`User connected: ${socket.id}`);

      // Join user to their personal room
      if (socket.data.userId) {
        socket.join(`user:${socket.data.userId}`);
      }

      // Game-related socket events
      socket.on('join-game', async (gameId: string) => {
        try {
          await this.gameEngine.joinGame(socket.data.userId, gameId);
          socket.join(`game:${gameId}`);
          this.io.to(`game:${gameId}`).emit('player-joined', { 
            userId: socket.data.userId,
            gameId 
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to join game' });
        }
      });

      socket.on('place-bet', async (data: { gameId: string, amount: number, choice: any }) => {
        try {
          const result = await this.gameEngine.placeBet(
            socket.data.userId, 
            data.gameId, 
            data.amount, 
            data.choice
          );
          socket.emit('bet-placed', result);
          this.io.to(`game:${data.gameId}`).emit('bet-update', {
            userId: socket.data.userId,
            amount: data.amount
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to place bet' });
        }
      });

      socket.on('disconnect', () => {
        this.logger.info(`User disconnected: ${socket.id}`);
      });
    });
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: [
        process.env.CLIENT_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'https://your-domain.com'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => this.logger.info(message.trim())
      }
    }));

    // Serve static files
    this.app.use(express.static(path.join(__dirname, 'dist')));
  }

  private setupRoutes(): void {
    // API routes
    this.app.use('/api/auth', userRoutes);
    this.app.use('/api/games', authMiddleware, gameRoutes);
    this.app.use('/api/payments', authMiddleware, paymentRoutes);
    this.app.use('/api/admin', authMiddleware, adminRoutes);
    this.app.use('/api/analytics', authMiddleware, analyticsRoutes);

    // Health check
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '2.0.0',
        services: {
          database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          redis: this.redis?.isReady ? 'connected' : 'disconnected'
        }
      });
    });

    // WebSocket endpoint info
    this.app.get('/api/socket-info', (req: Request, res: Response) => {
      res.json({
        connectedClients: this.io.engine.clientsCount,
        rooms: Array.from(this.io.sockets.adapter.rooms.keys())
      });
    });

    // Serve React app for all other routes
    this.app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const error: CustomError = new Error(`Not Found - ${req.originalUrl}`);
      error.status = 404;
      next(error);
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  private async connectDatabase(): Promise<void> {
    try {
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gaming_platform';
      
      await mongoose.connect(mongoURI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.logger.info('MongoDB connected successfully');
      
      mongoose.connection.on('error', (err) => {
        this.logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        this.logger.warn('MongoDB disconnected');
      });

    } catch (error) {
      this.logger.error('Database connection failed:', error);
      process.exit(1);
    }
  }

  public start(): void {
    const PORT = process.env.PORT || 7777;
    
    this.server.listen(PORT, () => {
      this.logger.info(`🚀 Advanced Gaming Platform running on port ${PORT}`);
      this.logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      this.logger.info(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      this.logger.info('SIGTERM received, shutting down gracefully');
      this.server.close(() => {
        mongoose.connection.close();
        this.redis?.quit();
        process.exit(0);
      });
    });
  }

  // Getters for services (for testing or external access)
  get gameEngineInstance() { return this.gameEngine; }
  get notificationServiceInstance() { return this.notificationService; }
  get paymentProcessorInstance() { return this.paymentProcessor; }
  get ioInstance() { return this.io; }
}

// Start the server
const server = new AdvancedGamingServer();
server.start();

export default server;