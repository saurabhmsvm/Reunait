import express from 'express';
import mongoose from 'mongoose';
import redis from '../services/redisClient.js';

const router = express.Router();

// Industry standard health check endpoint for monitoring and load balancers
router.get('/', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        checks: {
            database: 'unknown',
            redis: 'unknown'
        }
    };

    // Check MongoDB connection
    try {
        if (mongoose.connection.readyState === 1) {
            health.checks.database = 'connected';
        } else {
            health.checks.database = 'disconnected';
            health.status = 'degraded';
        }
    } catch (error) {
        health.checks.database = 'error';
        health.status = 'degraded';
    }

    // Check Redis connection (non-blocking, optional service)
    try {
        if (redis) {
            // Check Redis connection status
            const status = redis.status || 'unknown';
            if (status === 'ready' || status === 'connect') {
                health.checks.redis = 'connected';
            } else {
                health.checks.redis = status;
                // Redis is optional, so don't mark as degraded
            }
        } else {
            health.checks.redis = 'not_configured';
        }
    } catch (error) {
        health.checks.redis = 'error';
        // Redis is optional, so don't mark as degraded
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});

export default router;

