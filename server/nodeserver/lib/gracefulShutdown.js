import mongoose from "mongoose";
import redis from "../services/redisClient.js";
import { closeAllSSEConnections } from "../services/notificationBroadcast.js";

// Module-level flag to prevent multiple shutdown attempts
let isShuttingDown = false;
let shutdownTimeout = null;

/**
 * Close MongoDB connection (Mongoose 8.x uses promises)
 * @returns {Promise<void>}
 */
const closeMongoDB = async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    } catch (error) {
        console.error('Error closing MongoDB:', error);
    }
};

/**
 * Close Redis connection
 * @returns {Promise<void>}
 */
const closeRedis = async () => {
    if (redis && typeof redis.quit === 'function') {
        return new Promise((resolve) => {
            redis.quit((err) => {
                if (err) {
                    console.error('Error closing Redis:', err);
                } else {
                    console.log('Redis connection closed.');
                }
                resolve();
            });
        });
    }
};

/**
 * Graceful shutdown handler
 * Closes HTTP server, MongoDB, and Redis connections cleanly
 * @param {Object} server - Express HTTP server instance
 * @param {string} signal - Signal name (SIGTERM, SIGINT, etc.)
 */
export const gracefulShutdown = (server, signal) => {
    // Prevent multiple shutdown attempts
    if (isShuttingDown) {
        console.log('Shutdown already in progress, ignoring signal:', signal);
        return;
    }
    
    isShuttingDown = true;
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    // Remove all signal listeners to prevent re-entry
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    
    // Stop accepting new connections
    if (server) {
        // Helper to clear timeout and exit cleanly
        const cleanExit = (code = 0) => {
            if (shutdownTimeout) {
                clearTimeout(shutdownTimeout);
                shutdownTimeout = null;
            }
            // Use setImmediate to ensure all cleanup completes
            setImmediate(() => {
                process.exit(code);
            });
        };
        
        // Step 1: Stop accepting new connections (but allow existing ones to complete)
        server.close(() => {
            // This callback fires when all connections are closed
            // But we'll force-close after a short grace period
        });
        
        // Step 2: Give active requests grace period to complete (industry standard: 5-10 seconds)
        // This allows critical operations like DB writes, S3 uploads, Lambda calls to finish
        // Industry standard: 10 seconds total timeout, with 5-8 seconds grace period for requests
        const GRACE_PERIOD = 5000; // 5 seconds - allows most operations to complete
        const TOTAL_TIMEOUT = 10000; // 10 seconds - industry standard total timeout
        
        setTimeout(() => {
            // Step 3: After grace period, explicitly close SSE connections
            closeAllSSEConnections();
            
            // Step 4: Force close any remaining HTTP connections (SSE, long-polling, etc.)
            if (typeof server.closeAllConnections === 'function') {
                server.closeAllConnections();
            }
            
            // Step 5: Close database connections and exit
            (async () => {
                await closeMongoDB();
                await closeRedis();
                cleanExit(0);
            })();
        }, GRACE_PERIOD);
        
        // Set up force close timeout (10 seconds total - industry standard) as absolute safety net
        shutdownTimeout = setTimeout(async () => {
            console.error('Forced shutdown after timeout');
            await closeMongoDB();
            await closeRedis();
            process.exit(1);
        }, TOTAL_TIMEOUT);
    } else {
        // If server not started yet, just close connections
        (async () => {
            await closeMongoDB();
            process.exit(0);
        })();
    }
};

/**
 * Setup graceful shutdown handlers
 * @param {Object} server - Express HTTP server instance
 */
export const setupGracefulShutdown = (server) => {
    // Only setup once
    if (isShuttingDown) {
        return;
    }
    
    // Handle termination signals
    process.once('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
    process.once('SIGINT', () => gracefulShutdown(server, 'SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        gracefulShutdown(server, 'uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        gracefulShutdown(server, 'unhandledRejection');
    });
};

