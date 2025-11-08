import express from 'express';
import { requireAuth } from '@clerk/express';
import User from '../model/userModel.js';
import { createSession } from 'better-sse';
import { getUserChannel, getConnectionCount } from '../services/notificationBroadcast.js';

const router = express.Router();

// Connection limit from environment variable
const MAX_CONNECTIONS = parseInt(process.env.MAX_NOTIFICATIONS_CONNECTIONS || '1000', 10);

// POST /api/notifications/read - mark one or many as read (idempotent)
router.post('/notifications/read', requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth || {};
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (ids.length === 0) return res.json({ success: true, updatedIds: [], alreadyReadIds: [], invalidIds: [] });
    const batchSize = parseInt(process.env.NOTIFICATIONS_READ_BATCH_SIZE || '100', 10);
    const capped = ids.slice(0, batchSize);

    // Load user's notifications
    const user = await User.findOne({ clerkUserId: userId }).select('notifications').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const existing = new Map((user.notifications || []).map((n) => [String(n._id), n]));
    const invalidIds = capped.filter((id) => !existing.has(String(id)));
    const toMark = capped.filter((id) => {
      const n = existing.get(String(id));
      return n && n.isRead !== true;
    });
    const alreadyReadIds = capped.filter((id) => {
      const n = existing.get(String(id));
      return n && n.isRead === true;
    });

    if (toMark.length > 0) {
      await User.updateOne(
        { clerkUserId: userId },
        { $set: Object.fromEntries(toMark.map((id) => [`notifications.$[elem${id}].isRead`, true])) },
        { arrayFilters: toMark.map((id) => ({ [`elem${id}._id`]: id })) }
      );
    }

    return res.json({ success: true, updatedIds: toMark, alreadyReadIds, invalidIds });
  } catch (err) {
    try { console.error('[POST /api/notifications/read]', err); } catch {}
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/notifications/read-all - mark all as read (idempotent)
router.post('/notifications/read-all', requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth || {};
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    await User.updateOne(
      { clerkUserId: userId },
      { $set: { 'notifications.$[].isRead': true } }
    );
    
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/notifications?page=1&limit=20&filter=unread (optional filter: 'unread' or 'all')
router.get('/notifications', requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth || {};
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const page = parseInt(req.query.page) || 1;
    const defaultPageSize = parseInt(process.env.NOTIFICATIONS_DEFAULT_PAGE_SIZE || '20', 10);
    const maxPageSize = parseInt(process.env.NOTIFICATIONS_MAX_PAGE_SIZE || '50', 10);
    const limit = Math.min(parseInt(req.query.limit) || defaultPageSize, maxPageSize);
    const filter = req.query.filter === 'unread' ? 'unread' : 'all';
    
    const user = await User.findOne({ clerkUserId: userId }).select('notifications').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // Sort notifications by time descending
    let sorted = (user.notifications || []).sort((a, b) => {
      const at = a?.time ? new Date(a.time).getTime() : 0;
      const bt = b?.time ? new Date(b.time).getTime() : 0;
      return bt - at;
    });
    
    // Filter by read status if requested
    if (filter === 'unread') {
      sorted = sorted.filter(n => !n.isRead);
    }
    
    const total = sorted.length;
    const skip = (page - 1) * limit;
    const notifications = sorted.slice(skip, skip + limit).map(n => ({
      id: String(n._id),
      message: n.message || '',
      isRead: Boolean(n.isRead),
      isClickable: n.isClickable !== false,
      navigateTo: n.navigateTo || null,
      time: n.time || null,
    }));
    
    // Calculate totals and unread count from original full array (before filtering)
    const allSorted = (user.notifications || []).sort((a, b) => {
      const at = a?.time ? new Date(a.time).getTime() : 0;
      const bt = b?.time ? new Date(b.time).getTime() : 0;
      return bt - at;
    });
    const totalAll = allSorted.length;
    const unreadCount = allSorted.filter(n => !n.isRead).length;
    
    return res.json({
      success: true,
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: skip + limit < total,
        hasPrevPage: page > 1
      },
      unreadCount,
      totalAll
    });
  } catch (err) {
    console.error('[GET /api/notifications]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/notifications/stream - Server-Sent Events endpoint using Better SSE
router.get('/notifications/stream', requireAuth(), async (req, res) => {
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  try {
    const { userId } = req.auth || {};
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check connection limit
    const currentCount = getConnectionCount();
    
    if (currentCount >= MAX_CONNECTIONS) {
      return res.status(503).json({
        success: false,
        message: 'Connection limit reached. Please try again later.'
      });
    }

    // Get or create channel for this user
    const channel = getUserChannel(userId);

    // Create SSE session using Better SSE
    const keepAliveInterval = parseInt(process.env.SSE_KEEP_ALIVE_INTERVAL || '30000', 10);
    const retryInterval = parseInt(process.env.SSE_RETRY_INTERVAL || '2000', 10);
    const session = await createSession(req, res, {
      // Keep-alive interval from environment
      keepAlive: keepAliveInterval,
      // Reconnection time from environment
      retry: retryInterval,
      // CORS headers
      headers: {
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
      // Store userId in session state
      state: { userId },
    });

    // Register session with user's channel
    channel.register(session);

    // Send initial connection confirmation
    session.push({ message: 'Connected to notification stream' }, 'connected');

    // Load and send last 20 notifications on initial connect
    try {
      const user = await User.findOne({ clerkUserId: userId }).select('notifications').lean();
      if (user && user.notifications && user.notifications.length > 0) {
        // Sort notifications by time descending
        const sorted = user.notifications.sort((a, b) => {
          const at = a?.time ? new Date(a.time).getTime() : 0;
          const bt = b?.time ? new Date(b.time).getTime() : 0;
          return bt - at;
        });

        // Send initial notifications (count from environment)
        const initialCount = parseInt(process.env.SSE_INITIAL_NOTIFICATIONS_COUNT || '20', 10);
        const initialNotifications = sorted.slice(0, initialCount).map(n => ({
          id: String(n._id),
          message: n.message || '',
          isRead: Boolean(n.isRead),
          isClickable: n.isClickable !== false,
          navigateTo: n.navigateTo || null,
          time: n.time || null,
        }));

        // Compute pagination and unread count for the client
        const total = sorted.length;
        const pageSize = parseInt(process.env.NOTIFICATIONS_DEFAULT_PAGE_SIZE || '20', 10);
        const totalPages = Math.ceil(total / pageSize);
        const hasNextPage = pageSize < total;
        const unreadCount = sorted.filter(n => !n.isRead).length;

        session.push({
          notifications: initialNotifications,
          pagination: {
            currentPage: 1,
            totalPages,
            totalItems: total,
            hasNextPage,
            hasPrevPage: false,
          },
          unreadCount,
        }, 'initial');
      }
    } catch (error) {
      console.error(`[SSE] Error loading initial notifications:`, error);
      // Continue without initial notifications
    }

    // Handle session disconnect - automatically deregister
    session.on('disconnected', () => {
      channel.deregister(session);
    });

    // Better SSE handles heartbeat/keep-alive automatically
    // No need for manual intervals or cleanup - Better SSE handles it

  } catch (err) {
    console.error(`[SSE] SSE connection setup failed:`, err);
    try {
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    } catch (error) {
      // Response already sent or closed
    }
  }
});

export default router;


