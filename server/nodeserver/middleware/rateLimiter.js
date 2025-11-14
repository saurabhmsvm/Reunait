import {config} from '../config/config.js';
import redis from '../services/redisClient.js';

export const rateLimiter = async (req, res, next) => {
    try {
        // Prefer Clerk user id when available; fallback to client IP
        const userId = req.auth()?.userId;
        const clientIp = (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.ip || 'unknown';
        const identifier = userId ? `user:${userId}` : `ip:${clientIp}`;
        const key = `ratelimit:${identifier}`;

        // Window (seconds) derived from config (ms)
        const windowSec = Math.ceil(Number(config.rateLimitWindow) / 1000);
        const max = Number(config.rateLimitMax);
        
        // Get current count
        const count = await redis.incr(key);
        
        // Set expiry if this is the first request
        if (count === 1) {
            await redis.expire(key, windowSec);
        }
        
        // Remaining requests
        const remaining = Math.max(0, max - count);
        res.set('X-RateLimit-Limit', String(max));
        res.set('X-RateLimit-Remaining', String(remaining));
        res.set('X-RateLimit-Window', String(windowSec));
        
        // Check if rate limit exceeded
        if (count > max) {
            res.set('Retry-After', String(windowSec));
            return res.status(429).json({
                message: 'Too many requests, please try again later'
            });
        }
        
        next();
    } catch (error) {
        console.error('Rate limiter error:', error);
        // If Redis fails, allow the request to proceed
        next();
    }
}; 