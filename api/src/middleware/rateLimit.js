const ipHits = new Map();

/**
 * In-memory sliding window rate limiter
 * Cleans expired records lazily during request execution to avoid serverless timer leaks.
 */
export function rateLimiter({ maxRequests = 60, windowMs = 60 * 1000, message = 'Too many requests. Please slow down.' } = {}) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'anonymous';
    const now = Date.now();
    const key = `${ip}:${req.baseUrl || req.path}`;

    let record = ipHits.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      ipHits.set(key, record);
    } else {
      record.count += 1;
    }

    // Lazy cleanup of old entries to prevent memory growth (only when map gets large)
    if (ipHits.size > 2000) {
      for (const [k, v] of ipHits.entries()) {
        if (now > v.resetTime) {
          ipHits.delete(k);
        }
      }
    }

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfterSeconds: retryAfter,
        },
      });
    }

    next();
  };
}
