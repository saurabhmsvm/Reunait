import express from "express";
import mongoose from "mongoose";
import { requireAuth, clerkClient } from "@clerk/express";
import User from "../model/userModel.js";
import Case from "../model/caseModel.js";
import PoliceStation from "../model/policeStationModel.js";
import { deleteEmbeddings } from "../services/pineconeService.js";
import { broadcastNotification } from "../services/notificationBroadcast.js";

const router = express.Router();

// Volunteer role guard
async function requireVolunteer(req, res, next) {
  try {
    const { userId } = req.auth || {};
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const cu = await clerkClient.users.getUser(userId);
    const role = cu?.publicMetadata?.role;
    if (role !== "volunteer") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

// GET /api/volunteer/verifications
router.get("/verifications", requireAuth(), requireVolunteer, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const country = typeof req.query.country === "string" ? req.query.country : "all";

    // Optimized approach: Query MongoDB directly for pending verifications
    // isVerified field is synced with Clerk metadata, so we can query MongoDB without Clerk calls
    // This is much more efficient and scalable - works even with millions of users
    
    // Build MongoDB query filter
    const mongoFilter = { 
      role: "general_user",
      isVerified: false // Only pending verifications
    };
    
    if (country !== "all") {
      mongoFilter.country = country;
    }

    // Get total count for pagination
    const total = await User.countDocuments(mongoFilter);

    // Get paginated results directly from MongoDB
    const skip = (page - 1) * limit;
    const mongoUsers = await User.find(mongoFilter)
      .select("clerkUserId fullName country state city email createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format response (no Clerk calls needed!)
    const items = mongoUsers.map((user) => {
      // Get email from Clerk if needed, but for most cases MongoDB email is sufficient
      // We can fetch Clerk email only if MongoDB email is missing
      return {
        clerkUserId: user.clerkUserId,
        name: user.fullName || "",
        email: user.email || "",
        joined: user.createdAt,
        country: user.country || "Unknown",
        state: user.state || "",
        city: user.city || "",
      };
    });

    const hasMore = skip + items.length < total;

    return res.json({ 
      success: true,
      data: {
        items, 
        page, 
        limit, 
        total, 
        hasMore 
      }
    });
  } catch (err) {
    try { console.error("[GET /api/volunteer/verifications]", err); } catch {}
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/volunteer/verifications/:clerkUserId/approve
router.post("/verifications/:clerkUserId/approve", requireAuth(), requireVolunteer, async (req, res) => {
  try {
    const { clerkUserId } = req.params;
    if (!clerkUserId) return res.status(400).json({ success: false, message: "Missing clerkUserId" });

    // Check if user exists and is already approved (using MongoDB as source of truth)
    const existingUser = await User.findOne({ clerkUserId }).select('role isVerified').lean();
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (existingUser.role === "police" && existingUser.isVerified === true) {
      return res.json({ success: true, message: "Already approved." });
    }

    // Update Mongo User role and verification status (MongoDB is source of truth)
    const userDoc = await User.findOneAndUpdate(
      { clerkUserId },
      { $set: { role: "police", isVerified: true } },
      { new: true }
    ).lean();

    // Update Clerk metadata with role only (isVerified not stored in Clerk)
    try {
      await clerkClient.users.updateUserMetadata(clerkUserId, {
        publicMetadata: { role: "police", lastUpdated: new Date().toISOString() },
      });
    } catch (error) {
      // Log but don't fail - MongoDB update is the source of truth
      console.error('Failed to update Clerk metadata:', error);
    }

    // Cascade: update user's cases to reflect police role
    if (userDoc && Array.isArray(userDoc.cases) && userDoc.cases.length > 0) {
      await Case.updateMany(
        { _id: { $in: userDoc.cases } },
        { $set: { reportedBy: "police", addedBy: "police" } }
      );
    }

    // Register police station in PoliceStation collection
    // Only create if station name and country exist (state and city are optional)
    if (userDoc && userDoc.fullName && userDoc.country) {
      try {
        // Build query for existing station check
        const findQuery = {
          name: userDoc.fullName.trim(),
          country: userDoc.country.trim()
        };

        // Add state if it exists, otherwise match empty/null/missing state
        if (userDoc.state && userDoc.state.trim()) {
          findQuery.state = userDoc.state.trim();
        } else {
          findQuery.$or = [
            { state: "" },
            { state: null },
            { state: { $exists: false } }
          ];
        }

        // Add city if it exists, otherwise match empty/null/missing city
        if (userDoc.city && userDoc.city.trim()) {
          findQuery.city = userDoc.city.trim();
        } else {
          // If we already have $or for state, combine with $and
          if (findQuery.$or) {
            findQuery.$and = [
              { $or: findQuery.$or },
              { $or: [{ city: "" }, { city: null }, { city: { $exists: false } }] }
            ];
            delete findQuery.$or;
          } else {
            findQuery.$or = [
              { city: "" },
              { city: null },
              { city: { $exists: false } }
            ];
          }
        }

        // Check if station already exists (same name + location)
        const existingStation = await PoliceStation.findOne(findQuery).lean();

        if (!existingStation) {
          // Create new police station entry
          await PoliceStation.create({
            name: userDoc.fullName.trim(),
            country: userDoc.country.trim(),
            state: (userDoc.state && userDoc.state.trim()) || "",
            city: (userDoc.city && userDoc.city.trim()) || "",
            registeredBy: clerkUserId,
            isActive: true
          });
        }
        // If station exists, we don't update it (keeps original registeredBy)
      } catch (error) {
        // Log error but don't fail the verification if station creation fails
        // This could happen due to unique constraint violation or other issues
        console.error('Error creating police station entry:', error.message || error);
      }
    }

    return res.json({ success: true, message: "Verification approved. Role updated to police." });
  } catch (err) {
    try { console.error("[POST /api/volunteer/verifications/:id/approve]", err); } catch {}
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/volunteer/verifications/:clerkUserId/deny
router.post("/verifications/:clerkUserId/deny", requireAuth(), requireVolunteer, async (req, res) => {
  try {
    const { clerkUserId } = req.params;
    if (!clerkUserId) return res.status(400).json({ success: false, message: "Missing clerkUserId" });

    // Hard delete in Clerk (account removal), retain Mongo user for audit
    try {
      await clerkClient.users.deleteUser(clerkUserId);
    } catch {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Mark Mongo user as denied for audit visibility (non-privileged)
    // Set role to police_denied and clear isVerified to null so they don't appear in pending list
    try {
      await User.updateOne(
        { clerkUserId },
        { $set: { role: "police_denied", isVerified: null } }
      );
    } catch (_) {}

    return res.json({ success: true, message: "Verification denied. User removed." });
  } catch (err) {
    try { console.error("[POST /api/volunteer/verifications/:id/deny]", err); } catch {}
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/volunteer/flagged
router.get("/flagged", requireAuth(), requireVolunteer, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const country = typeof req.query.country === "string" ? req.query.country : "all";
    const skip = (page - 1) * limit;

    const filter = { isFlagged: true, showCase: { $ne: false } };
    if (country !== "all") {
      filter.country = country;
    }

    const [items, total] = await Promise.all([
      Case.find(filter)
        .select("_id fullName status country state city")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Case.countDocuments(filter),
    ]);

    const mapped = items.map((c) => ({
      caseId: String(c._id),
      fullName: c.fullName,
      status: c.status,
      country: c.country,
      state: c.state,
      city: c.city,
    }));

    return res.json({ items: mapped, page, limit, total, hasMore: total > skip + items.length });
  } catch (err) {
    try { console.error("[GET /api/volunteer/flagged]", err); } catch {}
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

// POST /api/volunteer/flagged/:caseId/unflag
router.post("/flagged/:caseId/unflag", requireAuth(), requireVolunteer, async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) return res.status(404).json({ status: "error", message: "Case not found" });
    const c = await Case.findById(caseId);
    if (!c) return res.status(404).json({ status: "error", message: "Case not found" });

    c.isFlagged = false;
    c.showCase = true;
    // timeline entry
    c.timelines.push({ message: "Case unflagged by volunteer" });
    await c.save();

    // Notify owner
    if (c.caseOwner) {
      const notificationData = {
        message: `Your case '${c.fullName || ""}' is no longer under review.`,
        time: new Date(),
        isRead: false,
        isClickable: false,
        navigateTo: null
      };

      const updatedUser = await User.findOneAndUpdate(
        { clerkUserId: c.caseOwner },
        { $push: { notifications: notificationData } },
        { new: true }
      ).select('notifications email').lean().catch(() => null);

      // Broadcast notification via SSE
      if (updatedUser && updatedUser.notifications && updatedUser.notifications.length > 0) {
        const newNotification = updatedUser.notifications[updatedUser.notifications.length - 1];
        const unreadCount = (updatedUser.notifications || []).filter(n => !n.isRead).length;
        try {
          broadcastNotification(c.caseOwner, {
            id: String(newNotification._id),
            message: newNotification.message || '',
            isRead: Boolean(newNotification.isRead),
            isClickable: newNotification.isClickable !== false,
            navigateTo: newNotification.navigateTo || null,
            time: newNotification.time || null,
            unreadCount,
          });
        } catch (error) {
          console.error('Error broadcasting unflag notification:', error);
        }
      }

      // Send email notification (non-blocking)
      if (updatedUser && updatedUser.email) {
        try {
          const { sendEmailNotificationAsync } = await import('../services/emailService.js');
          await sendEmailNotificationAsync(
            updatedUser.email,
            'Case No Longer Under Review',
            `Your case '${c.fullName || ""}' is no longer under review and has been made visible again on the platform.`,
            {
              notificationType: 'case_unflagged',
              userId: c.caseOwner,
              caseId: String(caseId),
              caseData: c, // Pass case data for metadata
            }
          );
        } catch (error) {
          console.error('Error sending email notification (non-blocking):', error);
          // Don't fail the request if email fails
        }
      }
    }

    return res.json({ status: "success", message: "Case unflagged and made visible." });
  } catch (err) {
    try { console.error("[POST /api/volunteer/flagged/:id/unflag]", err); } catch {}
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

// POST /api/volunteer/flagged/:caseId/hide
router.post("/flagged/:caseId/hide", requireAuth(), requireVolunteer, async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) return res.status(404).json({ status: "error", message: "Case not found" });
    const c = await Case.findById(caseId);
    if (!c) return res.status(404).json({ status: "error", message: "Case not found" });

    c.showCase = false;
    // timeline entry
    c.timelines.push({ message: "Case hidden by volunteer" });
    await c.save();

    // Best-effort Pinecone cleanup
    try { await deleteEmbeddings(caseId, c.country); } catch (e) { try { console.error("Pinecone delete failed", e?.message || e); } catch {} }

    // Notify owner
    if (c.caseOwner) {
      const notificationData = {
        message: `Your case '${c.fullName || ""}' was removed due to guideline violations.`,
        time: new Date(),
        isRead: false,
        isClickable: false,
        navigateTo: null
      };

      const updatedUser = await User.findOneAndUpdate(
        { clerkUserId: c.caseOwner },
        { $push: { notifications: notificationData } },
        { new: true }
      ).select('notifications email').lean().catch(() => null);

      // Broadcast notification via SSE
      if (updatedUser && updatedUser.notifications && updatedUser.notifications.length > 0) {
        const newNotification = updatedUser.notifications[updatedUser.notifications.length - 1];
        const unreadCount = (updatedUser.notifications || []).filter(n => !n.isRead).length;
        try {
          broadcastNotification(c.caseOwner, {
            id: String(newNotification._id),
            message: newNotification.message || '',
            isRead: Boolean(newNotification.isRead),
            isClickable: newNotification.isClickable !== false,
            navigateTo: newNotification.navigateTo || null,
            time: newNotification.time || null,
            unreadCount,
          });
        } catch (error) {
          console.error('Error broadcasting hide notification:', error);
        }
      }

      // Send email notification (non-blocking)
      if (updatedUser && updatedUser.email) {
        try {
          const { sendEmailNotificationAsync } = await import('../services/emailService.js');
          await sendEmailNotificationAsync(
            updatedUser.email,
            'Case Removed Due to Violations',
            `Your case '${c.fullName || ""}' was removed due to guideline violations.`,
            {
              notificationType: 'case_removed',
              userId: c.caseOwner,
              caseId: String(caseId),
              caseData: c, // Pass case data for metadata
            }
          );
        } catch (error) {
          console.error('Error sending email notification (non-blocking):', error);
          // Don't fail the request if email fails
        }
      }
    }

    return res.json({ status: "success", message: "Case hidden due to guideline violations." });
  } catch (err) {
    try { console.error("[POST /api/volunteer/flagged/:id/hide]", err); } catch {}
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

export default router;


