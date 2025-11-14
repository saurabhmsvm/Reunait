/**
 * SSE Notification Broadcast Service using Better SSE
 * Manages channels for user-specific notifications
 */

import { createChannel } from 'better-sse';

// Map to store channels per user: Map<userId, Channel>
const userChannels = new Map();

// Track all active sessions for connection counting
// Using Set for O(1) add/delete operations
const allActiveSessions = new Set();

// Maximum concurrent connections from environment variable
const MAX_CONNECTIONS = parseInt(process.env.MAX_NOTIFICATIONS_CONNECTIONS || '1000', 10);

/**
 * Helper function to check and cleanup empty channels
 * When session-deregistered fires, the session is already removed from channel.sessionCount
 * We can check synchronously, but use process.nextTick as a safety measure for edge cases
 * where multiple sessions disconnect simultaneously
 * @param {string} userId - User ID
 * @param {Channel} channel - Better SSE channel instance
 */
function cleanupEmptyChannel(userId, channel) {
  // Better SSE updates sessionCount synchronously when deregister() is called
  // However, we use process.nextTick as a safety measure to handle edge cases
  // where multiple sessions might disconnect simultaneously, ensuring we check
  // after all event handlers have completed
  process.nextTick(() => {
    // Check if channel is empty and still exists in map
    if (channel.sessionCount === 0 && userChannels.has(userId)) {
      userChannels.delete(userId);
    }
  });
}

/**
 * Get or create a channel for a specific user
 * Channel name format: `user:${userId}`
 * Channels are automatically managed per user
 */
function getUserChannel(userId) {
  if (!userChannels.has(userId)) {
    const channel = createChannel();
    userChannels.set(userId, channel);
    
    // Track sessions when they register with the channel
    channel.on('session-registered', (session) => {
      allActiveSessions.add(session);
    });
    
    // Track sessions when they deregister from the channel
    // This is the primary event - Better SSE fires this when deregister() is called
    channel.on('session-deregistered', (session) => {
      allActiveSessions.delete(session);
      // Clean up channel from map when it becomes empty
      cleanupEmptyChannel(userId, channel);
    });
    
    // Handle session disconnection (may fire in addition to session-deregistered)
    // This is a safety net in case session disconnects without explicit deregister
    channel.on('session-disconnected', (session) => {
      allActiveSessions.delete(session);
      // Only cleanup if not already handled by session-deregistered
      // The cleanup function is idempotent (safe to call multiple times)
      cleanupEmptyChannel(userId, channel);
    });
  }
  
  return userChannels.get(userId);
}

/**
 * Broadcast notification to a specific user
 * @param {string} userId - Clerk user ID
 * @param {object} notificationData - Notification payload
 * @returns {boolean} - Whether notification was sent successfully
 */
export function broadcastNotification(userId, notificationData) {
  try {
    const channel = getUserChannel(userId);
    
    // Check if channel has any active sessions
    if (channel.sessionCount === 0) {
      return false; // User not connected
    }

    // Broadcast to all sessions in the channel (multiple tabs/devices)
    channel.broadcast(notificationData, 'notification');
    return true;
  } catch (error) {
    console.error(`[SSE] Broadcast failed for user ${userId}:`, error.message);
    return false;
  }
}

/**
 * Send SSE message to a specific user (for ping, etc.)
 * @param {string} userId - Clerk user ID
 * @param {string} event - Event type
 * @param {object} data - Event data
 * @returns {boolean} - Whether message was sent successfully
 */
export function sendSSEMessage(userId, event, data) {
  try {
    const channel = getUserChannel(userId);
    
    if (channel.sessionCount === 0) {
      return false;
    }

    channel.broadcast(data, event);
    return true;
  } catch (error) {
    console.error(`[SSE Send] Failed to send to user ${userId}:`, error.message);
    return false;
  }
}

/**
 * Get connection count across all channels
 * @returns {number} - Total active connections
 */
export function getConnectionCount() {
  return allActiveSessions.size;
}

/**
 * Get connection info for a specific user
 * @param {string} userId - Clerk user ID
 * @returns {object|null} - Connection info or null if not connected
 */
export function getConnectionInfo(userId) {
  try {
    const channel = getUserChannel(userId);
    
    if (channel.sessionCount === 0) {
      return null;
    }

    return {
      userId,
      count: channel.sessionCount,
      connections: channel.activeSessions.map(() => ({
        connectedAt: new Date().toISOString(),
      }))
    };
  } catch (error) {
    console.error(`[SSE] Error getting connection info for user ${userId}:`, error.message);
    return null;
  }
}

/**
 * Remove all connections for a user (e.g., on logout)
 * @param {string} userId - Clerk user ID
 */
export function removeAllConnections(userId) {
  try {
    if (!userChannels.has(userId)) {
      return; // Channel doesn't exist
    }
    
    const channel = userChannels.get(userId);
    
    // Deregister all sessions from the channel
    // The session-deregistered events will automatically trigger cleanup via cleanupEmptyChannel
    for (const session of channel.activeSessions) {
      try {
        channel.deregister(session);
      } catch (error) {
        // Session already deregistered or closed
      }
    }
    
    // Additional immediate cleanup check as safety measure
    // The event handlers will also attempt cleanup, but this ensures it happens even if events don't fire
    cleanupEmptyChannel(userId, channel);
  } catch (error) {
    console.error(`[SSE] Error removing connections for user ${userId}:`, error.message);
  }
}

/**
 * Close all SSE connections during graceful shutdown
 * Properly deregisters all sessions and cleans up channels
 */
export function closeAllSSEConnections() {
  try {
    let closedCount = 0;
    
    // Iterate through all user channels
    for (const [userId, channel] of userChannels.entries()) {
      // Deregister all sessions from each channel
      for (const session of channel.activeSessions) {
        try {
          channel.deregister(session);
          closedCount++;
        } catch (error) {
          // Session already deregistered or closed
        }
      }
      
      // Clean up the channel
      cleanupEmptyChannel(userId, channel);
    }
    
    // Clear all channels
    userChannels.clear();
    allActiveSessions.clear();
    
    if (closedCount > 0) {
      console.log(`Closed ${closedCount} SSE connection(s).`);
    }
  } catch (error) {
    console.error('[SSE] Error closing all connections:', error.message);
  }
}

// Export helper to get channel (for route usage)
export { getUserChannel };
