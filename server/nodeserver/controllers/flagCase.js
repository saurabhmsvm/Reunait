import Case from "../model/caseModel.js";
import { clerkClient } from "@clerk/express";
import User from "../model/userModel.js";
import { broadcastNotification } from "../services/notificationBroadcast.js";

/**
 * Flag a case
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const flagCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const auth = req.auth();
    const userId = auth?.userId;

    // Validate required fields
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: "Case ID is required" 
      });
    }

    if (!reason) {
      return res.status(400).json({ 
        success: false, 
        message: "Flag reason is required" 
      });
    }

    // Validate reason
    const validReasons = ["Inappropriate content", "Spam/Fake case", "Privacy violation", "Harassment/Bullying", "Misinformation"];

    if (!validReasons.includes(reason)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid flag reason" 
      });
    }

    // Get case data
    const caseData = await Case.findById(id).lean();
    if (!caseData) {
      return res.status(404).json({ 
        success: false, 
        message: "Case not found" 
      });
    }

    // Check if case is already flagged
    if (caseData.isFlagged) {
      return res.status(400).json({ 
        success: false, 
        message: "Case is already flagged and hidden" 
      });
    }

    // Enforce authenticated-only flagging and single flag per user
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to flag cases"
      });
    }

    // Prevent case owner from flagging own case
    if (caseData.caseOwner && String(caseData.caseOwner) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot flag your own case"
      });
    }

    if (caseData.flags && caseData.flags.some(flag => flag.userId === userId)) {
      return res.status(400).json({ 
        success: false, 
        message: "You have already flagged this case" 
      });
    }

    // Get user role if authenticated
    let userRole = "general_user";
    if (userId) {
      try {
        const user = await clerkClient.users.getUser(userId);
        userRole = user.publicMetadata?.role || "general_user";
      } catch (error) {
        console.error('Failed to get user role from Clerk:', error);
        // Continue with default role
      }
    }

    // Create flag object
    const flagData = {
      userId: userId || null,
      userRole: userRole,
      reason: reason,
      timestamp: new Date(),
      ipAddress: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'Unknown'
    };

    // Add flag to case
    const updatedCase = await Case.findByIdAndUpdate(
      id,
      { $push: { flags: flagData } },
      { new: true }
    );

    if (!updatedCase) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to flag case" 
      });
    }

    // Check if case should be flagged on every 5th flag
    const flagCount = updatedCase.flags.length;
    let caseFlagged = false;

    if (flagCount % 5 === 0) {
      // Flag the case on every 5th flag
      await Case.findByIdAndUpdate(id, {
        isFlagged: true,
        showCase: false
      });

      caseFlagged = true;

      // Notify case owner when case is flagged and hidden
      if (caseData.caseOwner) {
        const notificationData = {
          message: `Your case '${caseData.fullName || "Unknown"}' has been flagged and hidden due to multiple reports.`,
          time: new Date(),
          isRead: false,
          isClickable: false,
          navigateTo: null
        };

        const updatedUser = await User.findOneAndUpdate(
          { clerkUserId: caseData.caseOwner },
          { $push: { notifications: notificationData } },
          { new: true }
        ).select('notifications email').lean().catch(() => null);

        // Broadcast notification via SSE
        if (updatedUser && updatedUser.notifications && updatedUser.notifications.length > 0) {
          const newNotification = updatedUser.notifications[updatedUser.notifications.length - 1];
          const unreadCount = (updatedUser.notifications || []).filter(n => !n.isRead).length;
          try {
            broadcastNotification(caseData.caseOwner, {
              id: String(newNotification._id),
              message: newNotification.message || '',
              isRead: Boolean(newNotification.isRead),
              isClickable: newNotification.isClickable !== false,
              navigateTo: newNotification.navigateTo || null,
              time: newNotification.time || null,
              unreadCount,
            });
          } catch (error) {
            console.error('Error broadcasting flag notification:', error);
            // Don't fail the request if broadcast fails
          }
        }

        // Send email notification (non-blocking)
        if (updatedUser && updatedUser.email) {
          try {
            const { sendEmailNotificationAsync } = await import('../services/emailService.js');
            await sendEmailNotificationAsync(
              updatedUser.email,
              'Case Flagged and Hidden',
              `Your case '${caseData.fullName || "Unknown"}' has been flagged and hidden due to multiple reports.`,
              {
                notificationType: 'case_flagged',
                userId: caseData.caseOwner,
                caseId: String(id),
                caseData: caseData, // Pass case data for metadata
              }
            );
          } catch (error) {
            console.error('Error sending email notification (non-blocking):', error);
            // Don't fail the request if email fails
          }
        }
      }
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: caseFlagged 
        ? "Case flagged successfully and hidden due to multiple reports"
        : "Case flagged successfully",
      data: {
        caseId: id,
        caseFlagged: caseFlagged,
        reason: reason
      }
    });

  } catch (error) {
    console.error("Error flagging case:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while flagging case",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
