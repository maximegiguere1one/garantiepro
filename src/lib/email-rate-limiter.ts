/**
 * Email Rate Limiter Service
 * Prevents email spam and ensures compliance with email provider limits
 */

interface RateLimitEntry {
  count: number;
  firstRequestAt: number;
  lastRequestAt: number;
}

interface RateLimitConfig {
  maxEmailsPerMinute: number;
  maxEmailsPerHour: number;
  maxEmailsPerDay: number;
  maxEmailsPerRecipient: number;
  recipientWindowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxEmailsPerMinute: 10,
  maxEmailsPerHour: 100,
  maxEmailsPerDay: 500,
  maxEmailsPerRecipient: 3,
  recipientWindowMs: 60 * 60 * 1000 // 1 hour
};

export class EmailRateLimiter {
  private config: RateLimitConfig;
  private globalRequests: number[] = [];
  private recipientRequests: Map<string, RateLimitEntry> = new Map();

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if an email can be sent
   */
  canSendEmail(recipientEmail: string): {
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  } {
    const now = Date.now();

    // Clean old entries
    this.cleanOldEntries(now);

    // Check global rate limits
    const globalCheck = this.checkGlobalLimits(now);
    if (!globalCheck.allowed) {
      return globalCheck;
    }

    // Check recipient-specific limits
    const recipientCheck = this.checkRecipientLimit(recipientEmail, now);
    if (!recipientCheck.allowed) {
      return recipientCheck;
    }

    return { allowed: true };
  }

  /**
   * Record that an email was sent
   */
  recordEmailSent(recipientEmail: string): void {
    const now = Date.now();

    // Record global request
    this.globalRequests.push(now);

    // Record recipient request
    const existing = this.recipientRequests.get(recipientEmail);
    if (existing) {
      existing.count++;
      existing.lastRequestAt = now;
    } else {
      this.recipientRequests.set(recipientEmail, {
        count: 1,
        firstRequestAt: now,
        lastRequestAt: now
      });
    }
  }

  /**
   * Check global rate limits (per minute, hour, day)
   */
  private checkGlobalLimits(now: number): {
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  } {
    // Check per minute
    const lastMinute = now - 60 * 1000;
    const emailsLastMinute = this.globalRequests.filter((t) => t >= lastMinute).length;

    if (emailsLastMinute >= this.config.maxEmailsPerMinute) {
      const oldestInWindow = Math.min(...this.globalRequests.filter((t) => t >= lastMinute));
      const retryAfter = oldestInWindow + 60 * 1000 - now;

      return {
        allowed: false,
        reason: `Rate limit exceeded: Maximum ${this.config.maxEmailsPerMinute} emails per minute`,
        retryAfter: Math.max(0, retryAfter)
      };
    }

    // Check per hour
    const lastHour = now - 60 * 60 * 1000;
    const emailsLastHour = this.globalRequests.filter((t) => t >= lastHour).length;

    if (emailsLastHour >= this.config.maxEmailsPerHour) {
      const oldestInWindow = Math.min(...this.globalRequests.filter((t) => t >= lastHour));
      const retryAfter = oldestInWindow + 60 * 60 * 1000 - now;

      return {
        allowed: false,
        reason: `Rate limit exceeded: Maximum ${this.config.maxEmailsPerHour} emails per hour`,
        retryAfter: Math.max(0, retryAfter)
      };
    }

    // Check per day
    const lastDay = now - 24 * 60 * 60 * 1000;
    const emailsLastDay = this.globalRequests.filter((t) => t >= lastDay).length;

    if (emailsLastDay >= this.config.maxEmailsPerDay) {
      const oldestInWindow = Math.min(...this.globalRequests.filter((t) => t >= lastDay));
      const retryAfter = oldestInWindow + 24 * 60 * 60 * 1000 - now;

      return {
        allowed: false,
        reason: `Rate limit exceeded: Maximum ${this.config.maxEmailsPerDay} emails per day`,
        retryAfter: Math.max(0, retryAfter)
      };
    }

    return { allowed: true };
  }

  /**
   * Check recipient-specific rate limit
   */
  private checkRecipientLimit(
    recipientEmail: string,
    now: number
  ): {
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  } {
    const entry = this.recipientRequests.get(recipientEmail);

    if (!entry) {
      return { allowed: true };
    }

    // Check if window has expired
    const windowExpired = now - entry.firstRequestAt >= this.config.recipientWindowMs;

    if (windowExpired) {
      // Reset the entry
      this.recipientRequests.delete(recipientEmail);
      return { allowed: true };
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxEmailsPerRecipient) {
      const retryAfter = entry.firstRequestAt + this.config.recipientWindowMs - now;

      return {
        allowed: false,
        reason: `Rate limit exceeded for recipient: Maximum ${this.config.maxEmailsPerRecipient} emails per hour`,
        retryAfter: Math.max(0, retryAfter)
      };
    }

    return { allowed: true };
  }

  /**
   * Clean old entries to prevent memory leaks
   */
  private cleanOldEntries(now: number): void {
    // Clean global requests older than 24 hours
    const dayAgo = now - 24 * 60 * 60 * 1000;
    this.globalRequests = this.globalRequests.filter((t) => t >= dayAgo);

    // Clean recipient requests older than window
    for (const [email, entry] of this.recipientRequests.entries()) {
      if (now - entry.firstRequestAt >= this.config.recipientWindowMs) {
        this.recipientRequests.delete(email);
      }
    }
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    globalRequestsLastMinute: number;
    globalRequestsLastHour: number;
    globalRequestsLastDay: number;
    activeRecipients: number;
    totalRequests: number;
  } {
    const now = Date.now();

    return {
      globalRequestsLastMinute: this.globalRequests.filter(
        (t) => t >= now - 60 * 1000
      ).length,
      globalRequestsLastHour: this.globalRequests.filter(
        (t) => t >= now - 60 * 60 * 1000
      ).length,
      globalRequestsLastDay: this.globalRequests.filter(
        (t) => t >= now - 24 * 60 * 60 * 1000
      ).length,
      activeRecipients: this.recipientRequests.size,
      totalRequests: this.globalRequests.length
    };
  }

  /**
   * Reset all rate limits (use with caution)
   */
  reset(): void {
    this.globalRequests = [];
    this.recipientRequests.clear();
  }

  /**
   * Format retry time for user display
   */
  static formatRetryAfter(milliseconds: number): string {
    const seconds = Math.ceil(milliseconds / 1000);

    if (seconds < 60) {
      return `${seconds} seconde${seconds > 1 ? 's' : ''}`;
    }

    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }

    const hours = Math.ceil(minutes / 60);
    return `${hours} heure${hours > 1 ? 's' : ''}`;
  }
}

// Export singleton instance
export const emailRateLimiter = new EmailRateLimiter();
