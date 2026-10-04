// Minimal in-memory sliding-window rate limiter. Sufficient for single-process
// deployments; swap for a shared store (Redis) when scaling horizontally.
const buckets = new Map();

export const rateLimit = ({ name = 'rl', windowMs = 60 * 1000, max = 10, keyFn }) => {
  return (req, res, next) => {
    // Dev-only hook so the integration test suite can run repeatably.
    if (process.env.NODE_ENV !== 'production' && req.headers['x-reset-rate-limit'] === '1') {
      buckets.clear();
    }
    // Buckets are keyed by limiter name + identity so each endpoint has its own
    // quota (shared bucket map otherwise conflates login/verify/request-otp).
    const key = `${name}:${keyFn ? keyFn(req) : req.ip}`;
    const now = Date.now();
    const bucket = buckets.get(key) || [];
    const windowStart = now - windowMs;

    const recent = bucket.filter((t) => t > windowStart);
    if (recent.length >= max) {
      const retryAfter = Math.ceil((recent[0] + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again shortly.',
        retryAfter,
      });
    }

    recent.push(now);
    buckets.set(key, recent);
    // Opportunistic cleanup to avoid unbounded growth.
    if (buckets.size > 10000) {
      for (const [k, times] of buckets) {
        if (times.every((t) => t <= windowStart)) buckets.delete(k);
      }
    }

    next();
  };
};

export const phoneKey = (req) => `${req.ip}:${req.body?.phone || ''}`;