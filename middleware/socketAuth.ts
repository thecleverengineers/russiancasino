import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

interface SocketData {
  userId: string;
  email: string;
  role: string;
}

export const socketAuth = async (socket: Socket, next: Function) => {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token as string,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JWTPayload;

    // Check if user exists and is active
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    if (!user.isActive) {
      return next(new Error('Authentication error: Account deactivated'));
    }

    // Attach user data to socket
    socket.data = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    } as SocketData;

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

// Middleware to check if user has admin privileges for admin socket rooms
export const adminSocketAuth = (socket: Socket, next: Function) => {
  const userData = socket.data as SocketData;
  
  if (!userData) {
    return next(new Error('Authentication required'));
  }

  const adminRoles = ['admin', 'superadmin'];
  
  if (!adminRoles.includes(userData.role)) {
    return next(new Error('Admin privileges required'));
  }

  next();
};