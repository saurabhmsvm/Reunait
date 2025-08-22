import Redis from 'ioredis';
import {config} from '../config/config.js';

// Create Redis client with Redis Cloud credentials
const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    username: config.redis.username,
    password: config.redis.password
});

// Handle Redis connection events
redis.on('connect', () => {
    console.log('Successfully connected to Redis Cloud');
});

redis.on('ready', () => {
    console.log('Redis client is ready to use');
});

redis.on('error', (error) => {
    console.error('Redis connection error:', error.message);
    console.error('Redis connection details:', {
        host: config.redis.host,
        port: config.redis.port,
        username: config.redis.username
    });
});

export const rateLimiter = async (req, res, next) => {
    try {
        // Use user ID if authenticated, fallback to IP
        const identifier = req.user ? `user:${req.user._id}` : `ip:${req.ip}`;
        const key = `ratelimit:${identifier}`;
        
        // Get current count
        const count = await redis.incr(key);
        
        // Set expiry if this is the first request
        if (count === 1) {
            await redis.expire(key, Math.ceil(config.rateLimitWindow / 1000));
        }
        
        // Check if rate limit exceeded
        if (count > config.rateLimitMax) {
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