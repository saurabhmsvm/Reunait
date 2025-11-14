import mongoose from "mongoose";
import os from "os";
import { setupGracefulShutdown } from "./gracefulShutdown.js";

/**
 * Get the server's network addresses
 * @returns {Array<string>} Array of IP addresses
 */
const getNetworkAddresses = () => {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }
    
    return addresses;
};

/**
 * Start the Express server
 * @param {Object} app - Express application instance
 * @param {number} port - Port number to listen on
 * @returns {Promise<Object>} - HTTP server instance
 */
export const startServer = async (app, port) => {
    return new Promise((resolve, reject) => {
        mongoose.connect(process.env.MONGO_URL, {
            dbName: process.env.DB_NAME || "Reunite"
        }).then(() => {
            const server = app.listen(port, '0.0.0.0', () => {
                const isProduction = process.env.NODE_ENV === 'production';
                
                // Production: Minimal logging (AWS EC2 best practice)
                if (isProduction) {
                    console.log(`Server started on port ${port}`);
                    console.log(`Health check: /health`);
                } else {
                    // Development: Verbose logging with all accessible URLs
                    console.log(`Server running on port ${port} and accessible from network`);
                    
                    const networkAddresses = getNetworkAddresses();
                    console.log(`Health check available at:`);
                    console.log(`  - http://localhost:${port}/health (local)`);
                    if (networkAddresses.length > 0) {
                        networkAddresses.forEach(ip => {
                            console.log(`  - http://${ip}:${port}/health (network)`);
                        });
                    }
                }
                
                // Setup graceful shutdown handlers
                setupGracefulShutdown(server);
                
                resolve(server);
            });
        }).catch((error) => {
            console.error(`${error} did not connect`);
            reject(error);
        });
    });
};

