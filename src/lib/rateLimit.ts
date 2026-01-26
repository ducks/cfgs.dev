// Simple sliding window rate limiter

interface RateLimitEntry {
  timestamps: number[];
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs = 60 * 60 * 1000; // 1 hour
  private readonly maxRequests = 5;

  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    this.cleanup();

    const now = Date.now();
    const entry = this.store.get(identifier) || { timestamps: [] };

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < this.windowMs);

    if (entry.timestamps.length >= this.maxRequests) {
      const oldestTimestamp = entry.timestamps[0];
      const resetAt = oldestTimestamp + this.windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Allow the request and record it
    entry.timestamps.push(now);
    this.store.set(identifier, entry);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.timestamps.length,
      resetAt: now + this.windowMs,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => now - ts < this.windowMs);
      if (entry.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();
