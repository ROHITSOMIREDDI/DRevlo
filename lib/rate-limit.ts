import { NextRequest } from 'next/server';

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Simple in-memory fallback for local development
const inMemoryCache = new Map<string, { count: number; resetTime: number }>();

/**
 * Native, zero-dependency rate limiter that uses Upstash Redis REST API if configured,
 * falling back to an in-memory process cache in development.
 */
export async function rateLimit(
  request: NextRequest,
  key: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const cacheKey = `ratelimit:${key}:${ip}`;
  const now = Math.floor(Date.now() / 1000);

  const redisUrl = process.env.UPSTASH_REDIS_URL;
  const redisToken = process.env.UPSTASH_REDIS_TOKEN;

  // Case A: Upstash Redis REST API is configured
  if (redisUrl && redisToken) {
    try {
      const cleanUrl = redisUrl.endsWith('/') ? redisUrl : `${redisUrl}/`;
      const response = await fetch(`${cleanUrl}pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', cacheKey],
          ['TTL', cacheKey],
        ]),
        // Prevent hanging requests on slow Redis network calls
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        const resultData = await response.json();
        const count = resultData[0]?.result || 1;
        let ttl = resultData[1]?.result || -1;

        // If TTL is -1 or key was newly created, set EXPIRE time
        if (ttl === -1 || count === 1) {
          await fetch(`${cleanUrl}EXPIRE/${cacheKey}/${windowSeconds}`, {
            headers: { Authorization: `Bearer ${redisToken}` },
          });
          ttl = windowSeconds;
        }

        const remaining = Math.max(0, limit - count);
        const reset = now + ttl;

        return {
          success: count <= limit,
          limit,
          remaining,
          reset,
        };
      }
    } catch (err) {
      console.error('Upstash Redis rate limiting call failed, falling back to process memory:', err);
    }
  }

  // Case B: Local In-Memory Fallback
  const record = inMemoryCache.get(cacheKey);

  if (!record || now > record.resetTime) {
    const resetTime = now + windowSeconds;
    inMemoryCache.set(cacheKey, { count: 1, resetTime });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetTime,
    };
  }

  record.count += 1;
  const remaining = Math.max(0, limit - record.count);

  return {
    success: record.count <= limit,
    limit,
    remaining,
    reset: record.resetTime,
  };
}

// Cache for GitHub webhook delivery IDs to prevent replay attacks
const processedWebhooks = new Map<string, number>();

/**
 * Checks if a GitHub webhook delivery ID has already been processed within the last 24 hours.
 * Uses Upstash Redis if configured, otherwise falls back to local in-memory cache.
 */
export async function isDuplicateWebhook(deliveryId: string): Promise<boolean> {
  const cacheKey = `webhook:github:${deliveryId}`;
  const now = Math.floor(Date.now() / 1000);
  const ttl = 86400; // 24 hours
  const expiry = now + ttl;

  const redisUrl = process.env.UPSTASH_REDIS_URL;
  const redisToken = process.env.UPSTASH_REDIS_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const cleanUrl = redisUrl.endsWith('/') ? redisUrl : `${redisUrl}/`;
      // Upstash SET key value EX seconds NX returns OK if set successfully, or null if exists
      const response = await fetch(`${cleanUrl}SET/${cacheKey}/1/NX/EX/${ttl}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        const data = await response.json();
        return data.result === null;
      }
    } catch (err) {
      console.error('Redis duplicate webhook check failed, falling back to local memory:', err);
    }
  }

  // Cleanup old local items occasionally (1% chance per check)
  if (Math.random() < 0.01) {
    for (const [key, exp] of processedWebhooks.entries()) {
      if (now > exp) {
        processedWebhooks.delete(key);
      }
    }
  }

  if (processedWebhooks.has(cacheKey)) {
    const exp = processedWebhooks.get(cacheKey)!;
    if (now <= exp) {
      return true;
    }
  }

  processedWebhooks.set(cacheKey, expiry);
  return false;
}
