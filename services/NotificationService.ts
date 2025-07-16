import nodemailer from 'nodemailer';
import twilio from 'twilio';
import webpush from 'web-push';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';

interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'normal' | 'high';
  channels?: ('email' | 'sms' | 'push' | 'socket')[];
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: any;
  private io?: any; // Socket.IO instance

  constructor() {
    this.initializeEmailService();
    this.initializeSMSService();
    this.initializePushService();
    console.log('📬 Notification Service initialized');
  }

  private initializeEmailService(): void {
    if (process.env.SMTP_HOST) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      // Use Ethereal for testing
      this.emailTransporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'ethereal.user@ethereal.email',
          pass: 'ethereal.pass'
        }
      });
    }
  }

  private initializeSMSService(): void {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  private initializePushService(): void {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:' + (process.env.SUPPORT_EMAIL || 'support@gaming-platform.com'),
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }
  }

  // Set Socket.IO instance for real-time notifications
  setSocketIO(io: any): void {
    this.io = io;
  }

  // Send notification through multiple channels
  async sendNotification(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create notification record
      const notification = new Notification({
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        priority: payload.priority || 'normal',
        channels: payload.channels || ['socket', 'email'],
        status: 'pending'
      });

      await notification.save();

      const channels = payload.channels || ['socket', 'email'];
      const results: any = {};

      // Send through each channel
      for (const channel of channels) {
        try {
          switch (channel) {
            case 'email':
              if (user.email && user.emailNotifications) {
                results.email = await this.sendEmail(user.email, payload);
              }
              break;
            
            case 'sms':
              if (user.phone && user.smsNotifications) {
                results.sms = await this.sendSMS(user.phone, payload);
              }
              break;
            
            case 'push':
              if (user.pushSubscription && user.pushNotifications) {
                results.push = await this.sendPushNotification(user.pushSubscription, payload);
              }
              break;
            
            case 'socket':
              results.socket = await this.sendSocketNotification(userId, payload);
              break;
          }
        } catch (error) {
          console.error(`Failed to send ${channel} notification:`, error);
          results[channel] = { success: false, error: (error as Error).message };
        }
      }

      // Update notification status
      const hasSuccess = Object.values(results).some((result: any) => result?.success);
      await Notification.findByIdAndUpdate(notification._id, {
        status: hasSuccess ? 'sent' : 'failed',
        deliveryResults: results,
        sentAt: hasSuccess ? new Date() : undefined
      });

    } catch (error) {
      console.error('Notification service error:', error);
    }
  }

  // Send email notification
  private async sendEmail(email: string, payload: NotificationPayload): Promise<any> {
    const template = this.getEmailTemplate(payload.type, payload);
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@gaming-platform.com',
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html
    };

    const result = await this.emailTransporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  }

  // Send SMS notification
  private async sendSMS(phone: string, payload: NotificationPayload): Promise<any> {
    if (!this.twilioClient) {
      throw new Error('SMS service not configured');
    }

    const message = await this.twilioClient.messages.create({
      body: this.getSMSTemplate(payload.type, payload),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    return { success: true, sid: message.sid };
  }

  // Send push notification
  private async sendPushNotification(subscription: any, payload: NotificationPayload): Promise<any> {
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: payload.data
    });

    const result = await webpush.sendNotification(subscription, notificationPayload);
    return { success: true, statusCode: result.statusCode };
  }

  // Send real-time socket notification
  private async sendSocketNotification(userId: string, payload: NotificationPayload): Promise<any> {
    if (!this.io) {
      throw new Error('Socket.IO not initialized');
    }

    this.io.to(`user:${userId}`).emit('notification', {
      id: Date.now(),
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  }

  // Get email template based on notification type
  private getEmailTemplate(type: string, payload: NotificationPayload): EmailTemplate {
    const baseHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${payload.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎮 Gaming Platform</h1>
        </div>
        <div class="content">
          <h2>${payload.title}</h2>
          <p>${payload.message}</p>
          {{CONTENT}}
        </div>
        <div class="footer">
          <p>This is an automated message from Gaming Platform. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;

    const templates: { [key: string]: Partial<EmailTemplate> } = {
      welcome: {
        subject: 'Welcome to Gaming Platform! 🎮',
        html: baseHTML.replace('{{CONTENT}}', `
          <p>Thank you for joining our gaming platform! Get ready for an exciting journey.</p>
          <a href="${process.env.CLIENT_URL}/dashboard" class="button">Get Started</a>
        `)
      },
      
      deposit_success: {
        subject: 'Deposit Successful ✅',
        html: baseHTML.replace('{{CONTENT}}', `
          <p>Your deposit has been processed successfully and added to your account balance.</p>
          <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>Amount:</strong> $${payload.data?.amount}<br>
            <strong>Transaction ID:</strong> ${payload.data?.transactionId}
          </div>
          <a href="${process.env.CLIENT_URL}/wallet" class="button">View Wallet</a>
        `)
      },

      withdrawal_success: {
        subject: 'Withdrawal Processed ✅',
        html: baseHTML.replace('{{CONTENT}}', `
          <p>Your withdrawal request has been processed successfully.</p>
          <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>Amount:</strong> $${payload.data?.amount}<br>
            <strong>Transaction ID:</strong> ${payload.data?.transactionId}
          </div>
        `)
      },

      game_win: {
        subject: 'Congratulations! You Won! 🎉',
        html: baseHTML.replace('{{CONTENT}}', `
          <p>🎉 Congratulations! You've won a game!</p>
          <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>Winnings:</strong> $${payload.data?.winnings}<br>
            <strong>Game:</strong> ${payload.data?.gameType}<br>
            <strong>Multiplier:</strong> ${payload.data?.multiplier}x
          </div>
          <a href="${process.env.CLIENT_URL}/games" class="button">Play Again</a>
        `)
      },

      security_alert: {
        subject: '🔒 Security Alert - Action Required',
        html: baseHTML.replace('{{CONTENT}}', `
          <p>We've detected unusual activity on your account. Please review and take action if necessary.</p>
          <div style="background: #f8d7da; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>Activity:</strong> ${payload.data?.activity}<br>
            <strong>Time:</strong> ${payload.data?.timestamp}<br>
            <strong>IP Address:</strong> ${payload.data?.ip}
          </div>
          <a href="${process.env.CLIENT_URL}/security" class="button">Review Security</a>
        `)
      }
    };

    const template = templates[type] || {
      subject: payload.title,
      html: baseHTML.replace('{{CONTENT}}', '')
    };

    return {
      subject: template.subject || payload.title,
      html: template.html || baseHTML.replace('{{CONTENT}}', ''),
      text: this.htmlToText(template.html || payload.message)
    };
  }

  // Get SMS template
  private getSMSTemplate(type: string, payload: NotificationPayload): string {
    const templates: { [key: string]: string } = {
      welcome: `Welcome to Gaming Platform! Start playing now: ${process.env.CLIENT_URL}`,
      deposit_success: `Deposit successful! $${payload.data?.amount} added to your account.`,
      withdrawal_success: `Withdrawal processed! $${payload.data?.amount} is on its way.`,
      game_win: `🎉 You won $${payload.data?.winnings} in ${payload.data?.gameType}! Play more: ${process.env.CLIENT_URL}/games`,
      security_alert: `Security Alert: ${payload.data?.activity}. Check your account: ${process.env.CLIENT_URL}/security`
    };

    return templates[type] || payload.message;
  }

  // Convert HTML to plain text
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  // Send bulk notifications
  async sendBulkNotification(
    userIds: string[],
    payload: NotificationPayload
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    const promises = userIds.map(async (userId) => {
      try {
        await this.sendNotification(userId, payload);
        sent++;
      } catch (error) {
        console.error(`Failed to send notification to user ${userId}:`, error);
        failed++;
      }
    });

    await Promise.allSettled(promises);
    return { sent, failed };
  }

  // Get user notifications
  async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<{ notifications: any[]; total: number; unread: number }> {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    const filter: any = { userId };
    if (unreadOnly) {
      filter.readAt = { $exists: false };
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId, readAt: { $exists: false } })
    ]);

    return {
      notifications,
      total,
      unread: unreadCount
    };
  }

  // Mark notification as read
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { readAt: new Date() }
    );
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { userId, readAt: { $exists: false } },
      { readAt: new Date() }
    );
  }

  // Delete notification
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    await Notification.findOneAndDelete({ _id: notificationId, userId });
  }

  // Get notification preferences
  async getNotificationPreferences(userId: string): Promise<any> {
    const user = await User.findById(userId).select('emailNotifications smsNotifications pushNotifications');
    return {
      email: user?.emailNotifications || false,
      sms: user?.smsNotifications || false,
      push: user?.pushNotifications || false
    };
  }

  // Update notification preferences
  async updateNotificationPreferences(
    userId: string,
    preferences: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    }
  ): Promise<void> {
    const updateData: any = {};
    if (preferences.email !== undefined) updateData.emailNotifications = preferences.email;
    if (preferences.sms !== undefined) updateData.smsNotifications = preferences.sms;
    if (preferences.push !== undefined) updateData.pushNotifications = preferences.push;

    await User.findByIdAndUpdate(userId, updateData);
  }
}