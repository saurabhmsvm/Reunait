import Case from "../model/caseModel.js";
import HomepageSection from "../model/homepageModel.js";
import redis from "../services/redisClient.js";
import { clerkClient } from "@clerk/express";
import { deleteEmbeddings } from "../services/pineconeService.js";
import User from "../model/userModel.js";

/**
 * Update case status to closed
 * Only case owner or police can change status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateCaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, reunited } = req.body;
    const auth = req.auth();
    const userId = auth?.userId;

    // Validate required fields
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: "Case ID is required" 
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
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

    // Check if case is already closed
    if (caseData.status === 'closed') {
      return res.status(400).json({ 
        success: false, 
        message: "Case is already closed" 
      });
    }

    // Authorization check: Only users who have this case in their cases array can close
    const userDoc = await User.findOne({ clerkUserId: userId }).select('cases').lean();
    const isListedOwner = Array.isArray(userDoc?.cases) && userDoc.cases.some((cId) => String(cId) === String(id));
    if (!isListedOwner) {
      return res.status(403).json({ 
        success: false, 
        message: "You are not authorized to close this case. Only the case owner can close it." 
      });
    }

    // Update case status and visibility
    const updateResult = await Case.findByIdAndUpdate(
      id,
      {
        originalStatus: caseData.status, // Save original status before closing
        status: 'closed',
        caseClosingDate: new Date(),
        showCase: false
      },
      { new: true }
    );

    if (!updateResult) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to update case status" 
      });
    }

    // Delete Pinecone embeddings (non-blocking)
    try {
      await deleteEmbeddings(id, caseData.country);
    } catch (pineconeError) {
      console.error('Pinecone deletion failed (non-blocking):', pineconeError);
      // Continue execution - don't fail the request
    }

    // Get user role for timeline entry
    let userRole = 'general_user';
    try {
      const user = await clerkClient.users.getUser(userId);
      userRole = user.publicMetadata?.role || 'general_user';
    } catch (error) {
      console.error('Failed to get user from Clerk:', error);
    }

    // Determine who is closing the case based on actual user role
    const roleDisplayName = userRole === 'police' ? 'Police Station' : 
                           userRole === 'NGO' ? 'NGO' : 
                           userRole === 'volunteer' ? 'Volunteer' : 'Case Owner';

    // Add timeline entry with proper formatting
    const timelineEntry = {
      message: `Case marked as closed by ${roleDisplayName}${reason ? ` - ${reason}` : ''}${reunited ? ' — Family reunited.' : ''}`,
      time: new Date(),
      ipAddress: req.ip || req.connection?.remoteAddress || 'Unknown',
      phoneNumber: caseData.contactNumber || 'Not provided',
      isRead: false
    };

    await Case.findByIdAndUpdate(id, {
      $push: { timelines: timelineEntry }
    });

    // Use the user role already determined above

    // Add notification to the case owner about case closure
    if (caseData.caseOwner) {
      const isClickable = userRole === 'police' || userRole === 'volunteer';
      const navigateTo = isClickable ? `/cases/${String(id)}` : null;
      
      const notificationData = {
        message: `Your case for ${caseData.fullName} has been closed${reunited ? ' - Family reunited!' : ''}`,
        time: new Date(),
        isRead: false,
        isClickable: isClickable,
        navigateTo: navigateTo
      };

      const updatedUser = await User.findOneAndUpdate(
        { clerkUserId: caseData.caseOwner },
        { $push: { notifications: notificationData } },
        { new: true }
      ).select('notifications email').lean();

      // Broadcast notification via SSE
      if (updatedUser && updatedUser.notifications && updatedUser.notifications.length > 0) {
        const newNotification = updatedUser.notifications[updatedUser.notifications.length - 1];
        const unreadCount = (updatedUser.notifications || []).filter(n => !n.isRead).length;
        try {
          const { broadcastNotification } = await import('../services/notificationBroadcast.js');
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
          console.error('Error broadcasting case status notification:', error);
          // Don't fail the request if broadcast fails
        }
      }

      // Send email notification (non-blocking)
      if (updatedUser && updatedUser.email) {
        try {
          const { sendEmailNotificationAsync } = await import('../services/emailService.js');
          const emailSubject = reunited 
            ? `Case Closed - Family Reunited!`
            : `Case Closed`;
          const emailMessage = reunited
            ? `Your case for ${caseData.fullName} has been closed - Family reunited! 🎉`
            : `Your case for ${caseData.fullName} has been closed.`;
          
          await sendEmailNotificationAsync(
            updatedUser.email,
            emailSubject,
            emailMessage,
            {
              notificationType: 'case_closed',
              userId: caseData.caseOwner,
              caseId: String(id),
              navigateTo: navigateTo,
              reunited: Boolean(reunited),
              caseData: caseData, // Pass full case data for metadata
            }
          );
        } catch (error) {
          console.error('Error sending email notification (non-blocking):', error);
          // Don't fail the request if email fails
        }
      }
    }

    // Increment homepage reunions counter if applicable (idempotent per transition)
    try {
      if (reunited === true) {
        await HomepageSection.incrementReunionsCount(1);
        try { await redis.set('homepage:cache:enabled', 'false'); } catch {}
      }
    } catch (metricErr) {
      console.error('Failed to increment reunions count (non-blocking):', metricErr);
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Case status updated successfully",
      data: {
        caseId: id,
        newStatus: "closed",
        closedAt: new Date(),
        closedBy: userId,
        reason: reason || null,
        reunited: Boolean(reunited)
      }
    });

  } catch (error) {
    console.error("Error updating case status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating case status",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
