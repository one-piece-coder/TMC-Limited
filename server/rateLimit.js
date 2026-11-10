// Small fixed-window, in-memory rate limiter. Fine for a single server process;
// use a shared store (e.g. Redis) if you run several instances behind a load balancer.
export function rateLimit({ windowMs, max, key = (req) => req.ip, message = "Too many requests. Please slow down." }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs);
  timer.unref();

  return (req, res, next) => {
    const now = Date.now();
    const k = key(req);
    let entry = hits.get(k);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(k, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ error: message, code: "rate_limited" });
    }
    next();
  };
}
