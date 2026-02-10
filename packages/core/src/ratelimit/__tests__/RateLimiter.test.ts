/**
 * Rate Limiting & Quotas Tests
 *
 * Comprehensive tests for token bucket rate limiter, quota manager, and tier configurations.
 *
 * @version 9.4.0
 * @sprint Sprint 9: Rate Limiting & Quotas
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenBucketRateLimiter } from '../RateLimiter';
import type { RateLimitConfig } from '../RateLimiter';
import { QuotaManager } from '../QuotaManager';
import type { QuotaConfig } from '../QuotaManager';
import {
  RATE_LIMIT_TIERS,
  QUOTA_TIERS,
  getRateLimitConfig,
  getQuotaConfig,
} from '../RateLimitTiers';

// =============================================================================
// TOKEN BUCKET RATE LIMITER
// =============================================================================

describe('TokenBucketRateLimiter', () => {
  const defaultConfig: RateLimitConfig = {
    tokensPerSecond: 10,
    tokensPerMinute: 60,
    burstSize: 20,
  };

  let limiter: TokenBucketRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new TokenBucketRateLimiter(defaultConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Construction
  // ---------------------------------------------------------------------------

  describe('construction', () => {
    it('should create a limiter with valid config', () => {
      const config = limiter.getConfig();
      expect(config.tokensPerSecond).toBe(10);
      expect(config.tokensPerMinute).toBe(60);
      expect(config.burstSize).toBe(20);
    });

    it('should reject tokensPerSecond <= 0', () => {
      expect(() => new TokenBucketRateLimiter({ ...defaultConfig, tokensPerSecond: 0 })).toThrow(
        'tokensPerSecond must be positive'
      );
      expect(() => new TokenBucketRateLimiter({ ...defaultConfig, tokensPerSecond: -1 })).toThrow(
        'tokensPerSecond must be positive'
      );
    });

    it('should reject tokensPerMinute <= 0', () => {
      expect(() => new TokenBucketRateLimiter({ ...defaultConfig, tokensPerMinute: 0 })).toThrow(
        'tokensPerMinute must be positive'
      );
    });

    it('should reject burstSize <= 0', () => {
      expect(() => new TokenBucketRateLimiter({ ...defaultConfig, burstSize: 0 })).toThrow(
        'burstSize must be positive'
      );
    });

    it('should not allow mutation of config after construction', () => {
      const config = limiter.getConfig();
      // Type-casting to bypass readonly for test
      (config as RateLimitConfig).burstSize = 999;
      expect(limiter.getConfig().burstSize).toBe(20);
    });
  });

  // ---------------------------------------------------------------------------
  // Token bucket fills and drains
  // ---------------------------------------------------------------------------

  describe('token bucket fills and drains', () => {
    it('should start with a full bucket (burstSize tokens)', () => {
      const result = limiter.checkLimit('user-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(20);
      expect(result.limit).toBe(20);
      expect(result.retryAfterMs).toBe(0);
    });

    it('should consume tokens on each call', () => {
      // Consume 1 token
      const r1 = limiter.consumeTokens('user-1');
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(19);

      // Consume 5 tokens
      const r2 = limiter.consumeTokens('user-1', 5);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(14);
    });

    it('should deny when bucket is empty', () => {
      // Drain all 20 tokens
      for (let i = 0; i < 20; i++) {
        const r = limiter.consumeTokens('user-1');
        expect(r.allowed).toBe(true);
      }

      // Next request should be denied
      const denied = limiter.consumeTokens('user-1');
      expect(denied.allowed).toBe(false);
      expect(denied.remaining).toBe(0);
      expect(denied.retryAfterMs).toBeGreaterThan(0);
    });

    it('should not consume tokens when check fails', () => {
      // Drain all tokens
      for (let i = 0; i < 20; i++) {
        limiter.consumeTokens('user-1');
      }

      // Try to consume more - should fail without consuming
      const r1 = limiter.consumeTokens('user-1', 5);
      expect(r1.allowed).toBe(false);

      // Advance time to refill 1 token (100ms at 10/sec)
      vi.advanceTimersByTime(100);

      // Now 1 token should be available
      const r2 = limiter.consumeTokens('user-1');
      expect(r2.allowed).toBe(true);
    });

    it('should reject consuming zero or negative tokens', () => {
      expect(() => limiter.consumeTokens('user-1', 0)).toThrow('Token count must be positive');
      expect(() => limiter.consumeTokens('user-1', -1)).toThrow('Token count must be positive');
    });
  });

  // ---------------------------------------------------------------------------
  // Per-key isolation
  // ---------------------------------------------------------------------------

  describe('per-key isolation', () => {
    it('should track separate buckets per key', () => {
      // Drain user-1
      for (let i = 0; i < 20; i++) {
        limiter.consumeTokens('user-1');
      }
      expect(limiter.consumeTokens('user-1').allowed).toBe(false);

      // user-2 should still have full bucket
      const r = limiter.consumeTokens('user-2');
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(19);
    });

    it('should report full bucket for unknown keys via getRemainingTokens', () => {
      expect(limiter.getRemainingTokens('never-seen')).toBe(20);
    });

    it('should track the number of keys', () => {
      expect(limiter.size).toBe(0);
      limiter.consumeTokens('a');
      limiter.consumeTokens('b');
      limiter.consumeTokens('c');
      expect(limiter.size).toBe(3);
    });

    it('should reset a single key without affecting others', () => {
      limiter.consumeTokens('user-1', 10);
      limiter.consumeTokens('user-2', 10);

      limiter.resetKey('user-1');

      // user-1 gets fresh bucket on next access
      expect(limiter.getRemainingTokens('user-1')).toBe(20);
      // user-2 is unchanged
      expect(limiter.getRemainingTokens('user-2')).toBe(10);
    });

    it('should reset all keys', () => {
      limiter.consumeTokens('user-1', 10);
      limiter.consumeTokens('user-2', 10);

      limiter.resetAll();

      expect(limiter.size).toBe(0);
      expect(limiter.getRemainingTokens('user-1')).toBe(20);
      expect(limiter.getRemainingTokens('user-2')).toBe(20);
    });
  });

  // ---------------------------------------------------------------------------
  // Burst handling
  // ---------------------------------------------------------------------------

  describe('burst handling', () => {
    it('should allow a burst up to burstSize', () => {
      // Single request for the full burst
      const r = limiter.consumeTokens('user-1', 20);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(0);
    });

    it('should deny a request exceeding burstSize', () => {
      const r = limiter.consumeTokens('user-1', 21);
      expect(r.allowed).toBe(false);
      expect(r.remaining).toBe(20);
    });

    it('should not accumulate beyond burstSize after refill', () => {
      // Start at 20 (burstSize), advance time significantly
      vi.advanceTimersByTime(10_000); // 10 seconds * 10 tokens/sec = 100 tokens refilled

      // But bucket caps at 20
      expect(limiter.getRemainingTokens('user-1')).toBe(20);
    });
  });

  // ---------------------------------------------------------------------------
  // Token refill over time
  // ---------------------------------------------------------------------------

  describe('token refill over time', () => {
    it('should refill tokens based on elapsed time', () => {
      // Consume all tokens
      limiter.consumeTokens('user-1', 20);
      expect(limiter.getRemainingTokens('user-1')).toBe(0);

      // Advance 500ms => 5 tokens refilled (10/sec * 0.5s)
      vi.advanceTimersByTime(500);
      expect(limiter.getRemainingTokens('user-1')).toBe(5);
    });

    it('should refill fractional tokens and floor the result', () => {
      limiter.consumeTokens('user-1', 20);

      // Advance 150ms => 1.5 tokens, floor to 1
      vi.advanceTimersByTime(150);
      expect(limiter.getRemainingTokens('user-1')).toBe(1);
    });

    it('should cap refill at burstSize', () => {
      limiter.consumeTokens('user-1', 20);

      // Advance 5 seconds => 50 tokens would refill, but cap at 20
      vi.advanceTimersByTime(5000);
      expect(limiter.getRemainingTokens('user-1')).toBe(20);
    });

    it('should calculate retryAfterMs correctly', () => {
      // Drain bucket
      limiter.consumeTokens('user-1', 20);

      const result = limiter.consumeTokens('user-1');
      expect(result.allowed).toBe(false);
      // Need 1 token at 10/sec => 100ms
      expect(result.retryAfterMs).toBe(100);
    });

    it('should allow after waiting retryAfterMs', () => {
      limiter.consumeTokens('user-1', 20);

      const denied = limiter.consumeTokens('user-1');
      expect(denied.allowed).toBe(false);

      vi.advanceTimersByTime(denied.retryAfterMs);

      const allowed = limiter.consumeTokens('user-1');
      expect(allowed.allowed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Per-minute limit
  // ---------------------------------------------------------------------------

  describe('per-minute limit', () => {
    it('should enforce per-minute cap', () => {
      // Config: 60 per minute, 20 burst, 10/sec
      // Consume 20, refill, consume 20, refill, consume 20 = 60 total
      limiter.consumeTokens('user-1', 20);
      vi.advanceTimersByTime(2000); // refill 20
      limiter.consumeTokens('user-1', 20);
      vi.advanceTimersByTime(2000); // refill 20
      limiter.consumeTokens('user-1', 20);

      // Now we've consumed 60 tokens in this minute, which is the limit
      vi.advanceTimersByTime(2000); // refill tokens (bucket would have tokens)
      const result = limiter.consumeTokens('user-1');
      expect(result.allowed).toBe(false);
    });

    it('should reset minute counter after 60 seconds', () => {
      // Exhaust minute limit
      limiter.consumeTokens('user-1', 20);
      vi.advanceTimersByTime(2000);
      limiter.consumeTokens('user-1', 20);
      vi.advanceTimersByTime(2000);
      limiter.consumeTokens('user-1', 20);

      // Minute limit hit
      vi.advanceTimersByTime(2000);
      expect(limiter.consumeTokens('user-1').allowed).toBe(false);

      // Advance past the 60-second minute window
      // We're at ~6000ms, need to get to >= 60000ms from start
      vi.advanceTimersByTime(60_000);

      // Now minute counter should have reset
      const result = limiter.consumeTokens('user-1');
      expect(result.allowed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // checkLimit vs consumeTokens
  // ---------------------------------------------------------------------------

  describe('checkLimit does not consume', () => {
    it('should not change remaining tokens on checkLimit', () => {
      const r1 = limiter.checkLimit('user-1');
      expect(r1.remaining).toBe(20);

      const r2 = limiter.checkLimit('user-1');
      expect(r2.remaining).toBe(20);

      // Only consumeTokens should change remaining
      limiter.consumeTokens('user-1');
      const r3 = limiter.checkLimit('user-1');
      expect(r3.remaining).toBe(19);
    });
  });
});

// =============================================================================
// QUOTA MANAGER
// =============================================================================

describe('QuotaManager', () => {
  const defaultQuotaConfig: QuotaConfig = {
    daily: {
      parseOperations: 100,
      compileOperations: 50,
      generateOperations: 30,
    },
    monthly: {
      totalBytes: 1_000_000,
      apiCalls: 5_000,
    },
  };

  let manager: QuotaManager;

  beforeEach(() => {
    vi.useFakeTimers();
    // Set to a known date: 2026-02-09 12:00:00 UTC
    vi.setSystemTime(new Date('2026-02-09T12:00:00Z'));
    manager = new QuotaManager(defaultQuotaConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Basic quota tracking
  // ---------------------------------------------------------------------------

  describe('basic quota tracking', () => {
    it('should allow operations within quota', () => {
      const result = manager.checkQuota('user-1', 'parseOperations');
      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(0);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(100);
    });

    it('should record usage and track it', () => {
      manager.recordUsage('user-1', 'parseOperations', 10);
      const result = manager.checkQuota('user-1', 'parseOperations');
      expect(result.currentUsage).toBe(10);
      expect(result.remaining).toBe(90);
    });

    it('should deny when quota is exceeded', () => {
      // Use up entire quota
      manager.recordUsage('user-1', 'compileOperations', 50);

      // Try to use one more
      const result = manager.recordUsage('user-1', 'compileOperations', 1);
      expect(result.allowed).toBe(false);
      expect(result.currentUsage).toBe(50);
      expect(result.remaining).toBe(0);
    });

    it('should not record usage when quota would be exceeded', () => {
      manager.recordUsage('user-1', 'generateOperations', 25);
      const denied = manager.recordUsage('user-1', 'generateOperations', 10);
      expect(denied.allowed).toBe(false);
      // Usage should remain at 25 (not 35)
      expect(denied.currentUsage).toBe(25);
    });

    it('should track monthly quotas separately', () => {
      manager.recordUsage('user-1', 'totalBytes', 500_000);
      const result = manager.checkQuota('user-1', 'totalBytes');
      expect(result.currentUsage).toBe(500_000);
      expect(result.limit).toBe(1_000_000);
      expect(result.remaining).toBe(500_000);
    });

    it('should track apiCalls as monthly quota', () => {
      for (let i = 0; i < 100; i++) {
        manager.recordUsage('user-1', 'apiCalls');
      }
      const result = manager.checkQuota('user-1', 'apiCalls');
      expect(result.currentUsage).toBe(100);
      expect(result.remaining).toBe(4_900);
    });
  });

  // ---------------------------------------------------------------------------
  // Per-key isolation
  // ---------------------------------------------------------------------------

  describe('per-key isolation', () => {
    it('should track separate quotas per key', () => {
      manager.recordUsage('user-1', 'parseOperations', 50);
      manager.recordUsage('user-2', 'parseOperations', 10);

      expect(manager.checkQuota('user-1', 'parseOperations').currentUsage).toBe(50);
      expect(manager.checkQuota('user-2', 'parseOperations').currentUsage).toBe(10);
    });

    it('should reset a single key', () => {
      manager.recordUsage('user-1', 'parseOperations', 50);
      manager.recordUsage('user-2', 'parseOperations', 10);

      manager.resetKey('user-1');

      expect(manager.checkQuota('user-1', 'parseOperations').currentUsage).toBe(0);
      expect(manager.checkQuota('user-2', 'parseOperations').currentUsage).toBe(10);
    });

    it('should track size of tracked keys', () => {
      expect(manager.size).toBe(0);
      manager.recordUsage('a', 'parseOperations');
      manager.recordUsage('b', 'parseOperations');
      expect(manager.size).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Usage snapshot
  // ---------------------------------------------------------------------------

  describe('getUsage', () => {
    it('should return zero usage for unknown keys', () => {
      const snapshot = manager.getUsage('new-user');
      expect(snapshot.key).toBe('new-user');
      expect(snapshot.daily.parseOperations).toBe(0);
      expect(snapshot.daily.compileOperations).toBe(0);
      expect(snapshot.daily.generateOperations).toBe(0);
      expect(snapshot.monthly.totalBytes).toBe(0);
      expect(snapshot.monthly.apiCalls).toBe(0);
    });

    it('should return accurate usage snapshot', () => {
      manager.recordUsage('user-1', 'parseOperations', 42);
      manager.recordUsage('user-1', 'compileOperations', 7);
      manager.recordUsage('user-1', 'totalBytes', 12345);

      const snapshot = manager.getUsage('user-1');
      expect(snapshot.daily.parseOperations).toBe(42);
      expect(snapshot.daily.compileOperations).toBe(7);
      expect(snapshot.daily.generateOperations).toBe(0);
      expect(snapshot.monthly.totalBytes).toBe(12345);
      expect(snapshot.monthly.apiCalls).toBe(0);
    });

    it('should include period start timestamps', () => {
      const snapshot = manager.getUsage('user-1');
      // 2026-02-09 00:00:00 UTC
      expect(snapshot.daily.periodStart).toBe('2026-02-09T00:00:00.000Z');
      // 2026-02-01 00:00:00 UTC
      expect(snapshot.monthly.periodStart).toBe('2026-02-01T00:00:00.000Z');
    });
  });

  // ---------------------------------------------------------------------------
  // Period rotation
  // ---------------------------------------------------------------------------

  describe('period rotation', () => {
    it('should reset daily usage when day changes', () => {
      manager.recordUsage('user-1', 'parseOperations', 80);
      expect(manager.checkQuota('user-1', 'parseOperations').currentUsage).toBe(80);

      // Advance to next day
      vi.setSystemTime(new Date('2026-02-10T01:00:00Z'));

      // Daily quotas should have reset
      const result = manager.checkQuota('user-1', 'parseOperations');
      expect(result.currentUsage).toBe(0);
      expect(result.remaining).toBe(100);
    });

    it('should reset monthly usage when month changes', () => {
      manager.recordUsage('user-1', 'totalBytes', 900_000);
      expect(manager.checkQuota('user-1', 'totalBytes').currentUsage).toBe(900_000);

      // Advance to next month
      vi.setSystemTime(new Date('2026-03-01T01:00:00Z'));

      // Monthly quotas should have reset
      const result = manager.checkQuota('user-1', 'totalBytes');
      expect(result.currentUsage).toBe(0);
      expect(result.remaining).toBe(1_000_000);
    });

    it('should not reset daily usage within same day', () => {
      manager.recordUsage('user-1', 'parseOperations', 50);

      // Advance 6 hours, still same day
      vi.setSystemTime(new Date('2026-02-09T18:00:00Z'));

      expect(manager.checkQuota('user-1', 'parseOperations').currentUsage).toBe(50);
    });

    it('should not reset monthly usage within same month', () => {
      manager.recordUsage('user-1', 'totalBytes', 500_000);

      // Advance 10 days, still same month
      vi.setSystemTime(new Date('2026-02-19T12:00:00Z'));

      expect(manager.checkQuota('user-1', 'totalBytes').currentUsage).toBe(500_000);
    });
  });

  // ---------------------------------------------------------------------------
  // Manual resets
  // ---------------------------------------------------------------------------

  describe('manual resets', () => {
    it('should resetDaily for all keys', () => {
      manager.recordUsage('user-1', 'parseOperations', 50);
      manager.recordUsage('user-2', 'compileOperations', 30);

      manager.resetDaily();

      expect(manager.checkQuota('user-1', 'parseOperations').currentUsage).toBe(0);
      expect(manager.checkQuota('user-2', 'compileOperations').currentUsage).toBe(0);
    });

    it('should resetMonthly for all keys', () => {
      manager.recordUsage('user-1', 'totalBytes', 500_000);
      manager.recordUsage('user-2', 'apiCalls', 2000);

      manager.resetMonthly();

      expect(manager.checkQuota('user-1', 'totalBytes').currentUsage).toBe(0);
      expect(manager.checkQuota('user-2', 'apiCalls').currentUsage).toBe(0);
    });

    it('should resetAll and clear all data', () => {
      manager.recordUsage('user-1', 'parseOperations', 50);
      manager.recordUsage('user-1', 'totalBytes', 500_000);

      manager.resetAll();

      expect(manager.size).toBe(0);
      expect(manager.checkQuota('user-1', 'parseOperations').currentUsage).toBe(0);
      expect(manager.checkQuota('user-1', 'totalBytes').currentUsage).toBe(0);
    });

    it('should preserve monthly data when daily is reset', () => {
      manager.recordUsage('user-1', 'parseOperations', 50);
      manager.recordUsage('user-1', 'totalBytes', 500_000);

      manager.resetDaily();

      expect(manager.checkQuota('user-1', 'parseOperations').currentUsage).toBe(0);
      expect(manager.checkQuota('user-1', 'totalBytes').currentUsage).toBe(500_000);
    });
  });

  // ---------------------------------------------------------------------------
  // Unlimited quotas (-1)
  // ---------------------------------------------------------------------------

  describe('unlimited quotas', () => {
    it('should always allow operations with -1 limit', () => {
      const unlimitedConfig: QuotaConfig = {
        daily: { parseOperations: -1, compileOperations: -1, generateOperations: -1 },
        monthly: { totalBytes: -1, apiCalls: -1 },
      };
      const unlimitedManager = new QuotaManager(unlimitedConfig);

      // Record massive usage
      unlimitedManager.recordUsage('user-1', 'parseOperations', 1_000_000);
      const result = unlimitedManager.checkQuota('user-1', 'parseOperations');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(result.limit).toBe(-1);
    });
  });

  // ---------------------------------------------------------------------------
  // Reset time reporting
  // ---------------------------------------------------------------------------

  describe('reset time reporting', () => {
    it('should report correct daily reset time', () => {
      const result = manager.checkQuota('user-1', 'parseOperations');
      // Day starts at 2026-02-09 00:00:00 UTC, resets at 2026-02-10 00:00:00 UTC
      expect(result.resetsAt).toBe('2026-02-10T00:00:00.000Z');
    });

    it('should report correct monthly reset time', () => {
      const result = manager.checkQuota('user-1', 'totalBytes');
      // Month starts at 2026-02-01 00:00:00 UTC, resets at 2026-03-01 00:00:00 UTC
      expect(result.resetsAt).toBe('2026-03-01T00:00:00.000Z');
    });
  });
});

// =============================================================================
// RATE LIMIT TIERS
// =============================================================================

describe('RateLimitTiers', () => {
  describe('RATE_LIMIT_TIERS', () => {
    it('should define free tier', () => {
      expect(RATE_LIMIT_TIERS.free).toEqual({
        tokensPerSecond: 2,
        tokensPerMinute: 10,
        burstSize: 5,
      });
    });

    it('should define pro tier', () => {
      expect(RATE_LIMIT_TIERS.pro).toEqual({
        tokensPerSecond: 20,
        tokensPerMinute: 100,
        burstSize: 50,
      });
    });

    it('should define enterprise tier', () => {
      expect(RATE_LIMIT_TIERS.enterprise).toEqual({
        tokensPerSecond: 200,
        tokensPerMinute: 1000,
        burstSize: 500,
      });
    });

    it('should have progressively larger limits', () => {
      expect(RATE_LIMIT_TIERS.free.tokensPerSecond).toBeLessThan(
        RATE_LIMIT_TIERS.pro.tokensPerSecond
      );
      expect(RATE_LIMIT_TIERS.pro.tokensPerSecond).toBeLessThan(
        RATE_LIMIT_TIERS.enterprise.tokensPerSecond
      );
    });
  });

  describe('QUOTA_TIERS', () => {
    it('should define free tier quotas', () => {
      expect(QUOTA_TIERS.free.daily.parseOperations).toBe(100);
      expect(QUOTA_TIERS.free.daily.compileOperations).toBe(50);
      expect(QUOTA_TIERS.free.daily.generateOperations).toBe(30);
      expect(QUOTA_TIERS.free.monthly.totalBytes).toBe(100_000_000);
      expect(QUOTA_TIERS.free.monthly.apiCalls).toBe(3_000);
    });

    it('should define pro tier quotas', () => {
      expect(QUOTA_TIERS.pro.daily.parseOperations).toBe(10_000);
      expect(QUOTA_TIERS.pro.monthly.apiCalls).toBe(300_000);
    });

    it('should define enterprise as unlimited (-1)', () => {
      expect(QUOTA_TIERS.enterprise.daily.parseOperations).toBe(-1);
      expect(QUOTA_TIERS.enterprise.daily.compileOperations).toBe(-1);
      expect(QUOTA_TIERS.enterprise.daily.generateOperations).toBe(-1);
      expect(QUOTA_TIERS.enterprise.monthly.totalBytes).toBe(-1);
      expect(QUOTA_TIERS.enterprise.monthly.apiCalls).toBe(-1);
    });
  });

  describe('getRateLimitConfig', () => {
    it('should return a copy of the config', () => {
      const config = getRateLimitConfig('free');
      expect(config).toEqual(RATE_LIMIT_TIERS.free);

      // Mutating the returned config should not affect the tier
      config.burstSize = 999;
      expect(RATE_LIMIT_TIERS.free.burstSize).toBe(5);
    });
  });

  describe('getQuotaConfig', () => {
    it('should return a deep copy of the config', () => {
      const config = getQuotaConfig('pro');
      expect(config).toEqual(QUOTA_TIERS.pro);

      // Mutating the returned config should not affect the tier
      config.daily.parseOperations = 999_999;
      expect(QUOTA_TIERS.pro.daily.parseOperations).toBe(10_000);
    });
  });
});

// =============================================================================
// INTEGRATION: TIERS + LIMITER + QUOTA
// =============================================================================

describe('Integration: tiers with limiter and quota manager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-09T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should work end-to-end with free tier rate limiter', () => {
    const limiter = new TokenBucketRateLimiter(RATE_LIMIT_TIERS.free);

    // Free tier: burstSize=5, 2/sec, 10/min
    // Should allow first 5 (burst)
    for (let i = 0; i < 5; i++) {
      expect(limiter.consumeTokens('user-free').allowed).toBe(true);
    }

    // 6th should be denied
    expect(limiter.consumeTokens('user-free').allowed).toBe(false);

    // After 500ms, 1 token refills (2/sec * 0.5s = 1)
    vi.advanceTimersByTime(500);
    expect(limiter.consumeTokens('user-free').allowed).toBe(true);
  });

  it('should work end-to-end with enterprise tier quota manager', () => {
    const manager = new QuotaManager(QUOTA_TIERS.enterprise);

    // Enterprise: all -1 (unlimited)
    for (let i = 0; i < 1000; i++) {
      const result = manager.recordUsage('enterprise-user', 'parseOperations');
      expect(result.allowed).toBe(true);
    }
    expect(manager.checkQuota('enterprise-user', 'parseOperations').remaining).toBe(Infinity);
  });

  it('should enforce free tier daily quota then allow after reset', () => {
    const manager = new QuotaManager(QUOTA_TIERS.free);

    // Free tier: 100 daily parse operations
    for (let i = 0; i < 100; i++) {
      expect(manager.recordUsage('user-free', 'parseOperations').allowed).toBe(true);
    }

    // 101st should be denied
    expect(manager.recordUsage('user-free', 'parseOperations').allowed).toBe(false);

    // Advance to next day
    vi.setSystemTime(new Date('2026-02-10T01:00:00Z'));

    // Should be allowed again
    expect(manager.recordUsage('user-free', 'parseOperations').allowed).toBe(true);
  });
});

// =============================================================================
// STATIC HELPER METHODS
// =============================================================================

describe('QuotaManager static helpers', () => {
  it('getDayStart should return UTC midnight', () => {
    const ts = new Date('2026-02-09T15:30:45.123Z').getTime();
    const dayStart = QuotaManager.getDayStart(ts);
    expect(new Date(dayStart).toISOString()).toBe('2026-02-09T00:00:00.000Z');
  });

  it('getMonthStart should return 1st of month at UTC midnight', () => {
    const ts = new Date('2026-02-15T10:20:30Z').getTime();
    const monthStart = QuotaManager.getMonthStart(ts);
    expect(new Date(monthStart).toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });

  it('getMonthStart should handle January correctly', () => {
    const ts = new Date('2026-01-31T23:59:59Z').getTime();
    const monthStart = QuotaManager.getMonthStart(ts);
    expect(new Date(monthStart).toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});
