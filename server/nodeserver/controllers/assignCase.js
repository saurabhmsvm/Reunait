import { clerkClient } from "@clerk/express";
import Case from "../model/caseModel.js";
import User from "../model/userModel.js";
import { broadcastNotification } from "../services/notificationBroadcast.js";

/**
 * Assign a case to a user
 * Only police and volunteer can assign cases
 * Case must have isAssigned === false
 */
export const assignCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: targetUserId } = req.body;
    const { userId: requesterId } = req.auth() || {};

    // Validate authentication
    if (!requesterId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in to assign cases."
      });
    }

    // Validate target user ID
    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Target user ID is required"
      });
    }

    // Get requester's role from Clerk
    let requesterRole = 'general_user';
    try {
      const requester = await clerkClient.users.getUser(requesterId);
      requesterRole = requester.publicMetadata?.role || 'general_user';
    } catch (error) {
      console.error('Failed to get requester from Clerk:', error);
      return res.status(500).json({
        success: false,
        message: "Failed to verify user authentication."
      });
    }

    // Only police and volunteer can assign cases
    if (requesterRole !== 'police' && requesterRole !== 'volunteer') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only police and volunteer users can assign cases."
      });
    }

    // Find the case
    const caseData = await Case.findById(id).lean();
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found"
      });
    }

    // Check if case is already assigned
    if (caseData.isAssigned === true) {
      return res.status(400).json({
        success: false,
        message: "Case is already assigned. Cannot reassign."
      });
    }

    // Validate target user exists and get their role
    const targetUser = await User.findOne({ clerkUserId: targetUserId }).select('role fullName email').lean();
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Target user not found"
      });
    }

    // Get requester's name for timeline message
    let requesterName = 'Police';
    if (requesterRole === 'volunteer') {
      requesterName = 'Volunteer';
    } else {
      try {
        const requesterUser = await User.findOne({ clerkUserId: requesterId }).select('fullName').lean();
        if (requesterUser?.fullName) {
          requesterName = requesterUser.fullName;
        }
      } catch (error) {
        // Use default "Police" if name lookup fails
      }
    }

    // Prepare timeline message based on role
    const timelineMessage = requesterRole === 'police' 
      ? 'Police assigned this case to the user.'
      : 'Volunteer assigned this case to the user.';

    // Update case: set isAssigned, caseOwner, reportedBy (to target user's role), and add timeline entry
    const timelineEntry = {
      type: 'case_assigned',
      message: timelineMessage,
      time: new Date(),
      ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown'
    };

    const updatedCase = await Case.findByIdAndUpdate(
      id,
      {
        $set: {
          isAssigned: true,
          caseOwner: targetUserId,
          // Flip reportedBy to reflect the assigned user's role
          reportedBy: (targetUser.role === 'police' || targetUser.role === 'NGO' || targetUser.role === 'volunteer')
            ? targetUser.role
            : 'general_user'
        },
        $push: {
          timelines: timelineEntry
        }
      },
      { new: true }
    ).lean();

    if (!updatedCase) {
      return res.status(500).json({
        success: false,
        message: "Failed to update case"
      });
    }

    // Add case ID to target user's cases array (use $addToSet to prevent duplicates)
    await User.findOneAndUpdate(
      { clerkUserId: targetUserId },
      { $addToSet: { cases: id } }
    );

    // Prepare notification data for target user
    const userNotificationData = {
      message: `A case has been assigned to you.`,
      time: new Date(),
      isRead: false,
      isClickable: true,
      navigateTo: `/cases/${id}`
    };

    // Add notification to target user
    const updatedTargetUser = await User.findOneAndUpdate(
      { clerkUserId: targetUserId },
      { $push: { notifications: userNotificationData } },
      { new: true }
    ).select('notifications email').lean();

    // Broadcast notification to target user via SSE
    if (updatedTargetUser && updatedTargetUser.notifications && updatedTargetUser.notifications.length > 0) {
      const newNotification = updatedTargetUser.notifications[updatedTargetUser.notifications.length - 1];
      const unreadCount = (updatedTargetUser.notifications || []).filter(n => !n.isRead).length;
      
      try {
        broadcastNotification(targetUserId, {
          id: String(newNotification._id),
          message: newNotification.message || '',
          isRead: Boolean(newNotification.isRead),
          isClickable: newNotification.isClickable !== false,
          navigateTo: newNotification.navigateTo || null,
          time: newNotification.time || null,
          unreadCount,
        });
      } catch (error) {
        console.error('Error broadcasting notification to target user:', error);
      }
    }

    // Send email notification to target user (non-blocking)
    if (updatedTargetUser && updatedTargetUser.email) {
      try {
        const { sendEmailNotificationAsync } = await import('../services/emailService.js');
        await sendEmailNotificationAsync(
          updatedTargetUser.email,
          'Case Assigned to You',
          `A case has been assigned to you. Please review and take necessary action.`,
          {
            notificationType: 'case_assigned',
            userId: targetUserId,
            caseId: String(id),
            navigateTo: `/cases/${id}`,
            caseData: caseData, // Pass case data for metadata
          }
        );
      } catch (error) {
        console.error('Error sending email notification to target user (non-blocking):', error);
      }
    }

    // Prepare notification data for requester (police/volunteer)
    const requesterNotificationData = {
      message: `Case has been successfully assigned to ${targetUser.fullName || targetUser.email || 'the user'}.`,
      time: new Date(),
      isRead: false,
      isClickable: true,
      navigateTo: `/cases/${id}`
    };

    // Add notification to requester
    const updatedRequester = await User.findOneAndUpdate(
      { clerkUserId: requesterId },
      { $push: { notifications: requesterNotificationData } },
      { new: true }
    ).select('notifications email').lean();

    // Broadcast notification to requester via SSE
    if (updatedRequester && updatedRequester.notifications && updatedRequester.notifications.length > 0) {
      const newNotification = updatedRequester.notifications[updatedRequester.notifications.length - 1];
      const unreadCount = (updatedRequester.notifications || []).filter(n => !n.isRead).length;
      
      try {
        broadcastNotification(requesterId, {
          id: String(newNotification._id),
          message: newNotification.message || '',
          isRead: Boolean(newNotification.isRead),
          isClickable: newNotification.isClickable !== false,
          navigateTo: newNotification.navigateTo || null,
          time: newNotification.time || null,
          unreadCount,
        });
      } catch (error) {
        console.error('Error broadcasting notification to requester:', error);
      }
    }

    // Send email notification to requester (non-blocking)
    if (updatedRequester && updatedRequester.email) {
      try {
        const { sendEmailNotificationAsync } = await import('../services/emailService.js');
        await sendEmailNotificationAsync(
          updatedRequester.email,
          'Case Assignment Confirmed',
          `Case has been successfully assigned to ${targetUser.fullName || targetUser.email || 'the user'}.`,
          {
            notificationType: 'case_assignment_confirmed',
            userId: requesterId,
            caseId: String(id),
            navigateTo: `/cases/${id}`,
            caseData: caseData, // Pass case data for metadata
            targetUserName: targetUser.fullName,
            targetUserEmail: targetUser.email,
          }
        );
      } catch (error) {
        console.error('Error sending email notification to requester (non-blocking):', error);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Case assigned successfully",
      data: {
        caseId: id,
        assignedTo: targetUserId,
        assignedBy: requesterId,
        isAssigned: true
      }
    });

  } catch (error) {
    console.error("Error assigning case:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign case",
      error: error.message
    });
  }
};

