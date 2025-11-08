import Case from "../model/caseModel.js";
import { clerkClient } from "@clerk/express";
import { getPresignedGetUrl } from "../services/s3Service.js";
import User from "../model/userModel.js";
import { config } from "../config/config.js";
import mongoose from "mongoose";

export const getCaseById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format before querying database
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ 
        success: false, 
        message: "Case not found" 
      });
    }

    // Extract user role from Clerk public metadata (if authenticated)
    let userRole = 'general_user';
    const auth = req.auth();
    if (auth?.userId) {
      try {
        const user = await clerkClient.users.getUser(auth.userId);
        userRole = user.publicMetadata?.role || 'general_user';
      } catch (error) {
        console.error('Failed to get user from Clerk:', error);
        userRole = 'general_user';
      }
    }
    // If not authenticated, default to general_user (public access)
    

    const caseData = await Case.findById(id).lean();
    if (!caseData) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    // Check if case should be shown (not closed or hidden)
    // Allow police and case owners to see closed cases
    
    if (caseData.showCase === false && (userRole === 'general_user' || userRole === 'NGO')) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    // Check if case is flagged and should be hidden from public
    if (caseData.isFlagged && (userRole === 'general_user' || userRole === 'NGO')) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    // Check if case is closed - only police and volunteers can see closed cases
    if (caseData.status === 'closed' && userRole !== 'police' && userRole !== 'volunteer') {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    // Build notifications from timelines for response compatibility
    let filteredNotifications = [];
    const sourceTimeline = Array.isArray(caseData.timelines) ? caseData.timelines : [];
    
    // Only process timelines if user is authenticated (frontend only shows progress to case owners)
    if (sourceTimeline.length > 0 && auth?.userId) {
      const viewerIsOwner = Boolean(auth?.userId) && String(caseData.caseOwner) === String(auth.userId);
      if (userRole === 'police' || (userRole === 'volunteer' && !viewerIsOwner)) {
        // Police and non-owner volunteers get full details (IP and phone)
        filteredNotifications = sourceTimeline.map(notification => {
          // Handle flag entries - check flagData first
          let message = null;
          if (notification.flagData) {
            message = `Case flagged for ${notification.flagData.reason} by ${notification.flagData.userRole}`;
          } else if (notification.message) {
            message = notification.message;
          }
          
          // Skip notifications without proper message
          if (!message) {
            return null;
          }
          
          return {
            message: message || "An update has been made to your case",
            time: notification.time,
            ipAddress: notification.ipAddress,
            phoneNumber: notification.phoneNumber,
            isRead: notification.isRead
          };
        }).filter(Boolean);
      } else if (viewerIsOwner) {
        // Case owner: include sensitive details if owner is police or volunteer
        const allowSensitive = (userRole === 'police' || userRole === 'volunteer');
        filteredNotifications = sourceTimeline.map(notification => {
          // Handle flag entries - check flagData
          let message = null;
          if (notification.flagData) {
            message = `Case flagged for ${notification.flagData.reason}`;
          } else if (notification.message) {
            message = notification.message;
          }
          
          // Skip notifications without proper message
          if (!message) {
            return null;
          }
          
          // If owner is not police/volunteer and this is a report, mask the message
          if (!(userRole === 'police' || userRole === 'volunteer') && notification.type === 'report_info') {
            message = 'New information received.';
          }

          const shaped = {
            message: message,
            time: notification.time,
            isRead: notification.isRead
          };
          if (allowSensitive && notification.phoneNumber) shaped.phoneNumber = notification.phoneNumber;
          if (allowSensitive && notification.ipAddress) shaped.ipAddress = notification.ipAddress;
          return shaped;
        }).filter(Boolean);
      } else {
        // Authenticated general users/NGO who are not owners get basic notifications without sensitive details
        filteredNotifications = sourceTimeline.map(notification => {
          // Handle flag entries - check flagData first since flag entries don't have message field
          let message = null;
          if (notification.flagData) {
            message = `Case flagged for ${notification.flagData.reason}`;
          } else if (notification.message) {
            message = notification.message;
          }
          
          // Skip notifications without proper message
          if (!message) {
            return null;
          }
          
          // Mask report messages for non-privileged viewers
          if (notification.type === 'report_info') {
            message = 'New information received.';
          }

          return {
            message: message,
            time: notification.time,
            isRead: notification.isRead
          };
        }).filter(Boolean);
      }
    }
    // Unauthenticated users get empty array (not shown on frontend anyway)

    // Generate image URLs using country-based key prefix with .jpg extension
    const imageUrls = [];
    try {
      const countryPath = (caseData.country || "India").replace(/\s+/g, '_').toLowerCase();
      for (let i = 1; i <= 2; i++) {
        const key = `${countryPath}/${caseData._id}_${i}.jpg`;
        try {
          const imageUrl = await getPresignedGetUrl(config.awsBucketName, key);
          imageUrls.push(imageUrl);
        } catch (error) {
          // Ignore failures for missing images
        }
      }
    } catch (error) {
      // Ignore image URL generation errors
    }

    // Fetch similar cases if similarCaseIds exists
    let similarCases = [];
    if (caseData.similarCaseIds && caseData.similarCaseIds.length > 0) {
      const similarCasesData = await Case.find({
        _id: { $in: caseData.similarCaseIds }
      }).select('-notifications').lean();

      // Transform similar cases (same logic as AI search)
      similarCases = await Promise.all(similarCasesData.map(async (similarCase) => {
        // Generate image URLs for each similar case
        const similarImageUrls = [];
        try {
          const countryPath = (similarCase.country || "India").replace(/\s+/g, '_').toLowerCase();
          for (let i = 1; i <= 2; i++) {
            const key = `${countryPath}/${similarCase._id}_${i}.jpg`;
            try {
              const imageUrl = await getPresignedGetUrl(config.awsBucketName, key);
              similarImageUrls.push(imageUrl);
            } catch (error) {
              // Ignore missing images
            }
          }
        } catch (error) {
          // Ignore image URL generation errors
        }

        return {
          _id: similarCase._id,
          fullName: similarCase.fullName,
          age: similarCase.age,
          gender: similarCase.gender,
          status: similarCase.status,
          city: similarCase.city,
          state: similarCase.state,
          country: similarCase.country,
          dateMissingFound: similarCase.dateMissingFound,
          reward: similarCase.reward,
          reportedBy: similarCase.reportedBy,
          imageUrls: similarImageUrls
        };
      }));
    }

    // Modify lastSearchedTime based on user role
    // General users get normal cooldown; police, NGO, and volunteers get null (always enabled)
    const modifiedLastSearchedTime = (userRole === "general_user")
      ? caseData.lastSearchedTime
      : null;
    

    const isAuthenticated = !!(auth?.userId)
    const alreadyFlaggedByUser = isAuthenticated && Array.isArray(caseData.flags) && caseData.flags.some(f => f.userId === auth.userId)
    
    // Updated isCaseOwner logic: police/volunteer users OR actual case owners
    const isCaseOwner = isAuthenticated && (
      userRole === 'police' || userRole === 'volunteer' ||
      String(caseData.caseOwner) === String(auth.userId)
    )
    
    // canCloseCase logic: user must be authenticated and case ID must be in user's cases array
    let canCloseCase = false
    if (isAuthenticated) {
      try {
        const userDoc = await User.findOne({ clerkUserId: auth.userId }).select('cases').lean()
        canCloseCase = Array.isArray(userDoc?.cases) && userDoc.cases.some((cId) => String(cId) === String(caseData._id))
      } catch (e) {
        canCloseCase = false
      }
    }
    
    const isFlaggableState = caseData.showCase !== false && caseData.status !== 'closed'
    const canFlag = Boolean(isAuthenticated) && !alreadyFlaggedByUser && isFlaggableState

    // Check if user can assign case (police/volunteer only, and case must not be assigned)
    const canAssign = Boolean(isAuthenticated) && 
                      (userRole === 'police' || userRole === 'volunteer') && 
                      caseData.isAssigned === false

    const transformed = {
      _id: caseData._id,
      fullName: caseData.fullName,
      status: caseData.status,
      originalStatus: caseData.originalStatus,
      dateMissingFound: caseData.dateMissingFound,
      caseClosingDate: caseData.caseClosingDate,
      description: caseData.aiDescription,
      reward: caseData.reward,
      imageUrls,
      lastSearchedTime: modifiedLastSearchedTime,
      age: caseData.age,
      gender: caseData.gender,
      city: caseData.city,
      state: caseData.state,
      country: caseData.country,
      contactNumber: caseData.contactNumber,
      addedBy: caseData.addedBy,
      caseOwner: caseData.caseOwner,
      isAssigned: caseData.isAssigned || false,
      similarCases,
      notifications: filteredNotifications.reverse(),
      canFlag,
      canAssign,
      isCaseOwner,
      canCloseCase,
      // Precomputed sections for direct rendering on the client
      sections: (() => {
        const sections = [];

        const toStr = (v) => (v == null ? undefined : String(v));
        const formatDate = (d) => {
          try {
            const dt = new Date(d);
            return dt.toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
          } catch {
            return toStr(d);
          }
        };
        const formatDateTime = (d) => {
          try {
            const dt = new Date(d);
            return dt.toLocaleString('en-GB', {
              year: 'numeric', month: 'short', day: '2-digit',
              hour: '2-digit', minute: '2-digit', hour12: false
            });
          } catch {
            return toStr(d);
          }
        };

        // Personal Information
        const personalItems = [];
        if (caseData.age) personalItems.push({ label: 'Age', value: toStr(caseData.age) });
        if (caseData.gender) personalItems.push({ label: 'Gender', value: toStr(caseData.gender) });
        if (caseData.height) personalItems.push({ label: 'Height', value: toStr(caseData.height) });
        if (caseData.complexion) personalItems.push({ label: 'Complexion', value: toStr(caseData.complexion) });
        if (caseData.identificationMark) personalItems.push({ label: 'Identification Mark', value: toStr(caseData.identificationMark), fullWidth: true });
        // Contact number will be shown in the Description section only
        if (personalItems.length) sections.push({ title: 'Personal Information', items: personalItems });

        // Case Details
        const caseDetailItems = [];
        if (caseData.status) caseDetailItems.push({ label: 'Status', value: String(caseData.status).charAt(0).toUpperCase() + String(caseData.status).slice(1) });
        if (caseData.dateMissingFound) {
          // Always show the original date with appropriate label
          const originalDateLabel = caseData.status === 'missing' ? 'Last Seen On' : (caseData.status === 'found' ? 'Found On' : 'Last Seen On');
          caseDetailItems.push({ label: originalDateLabel, value: formatDate(caseData.dateMissingFound) });
        }
        
        // Add closed date if case is closed
        if (caseData.status === 'closed' && caseData.caseClosingDate) {
          caseDetailItems.push({ label: 'Case Closed On', value: formatDate(caseData.caseClosingDate) });
        }
        if (caseData.reward) caseDetailItems.push({ label: 'Reward', value: toStr(caseData.reward) });
  
        if (caseData.reportedBy) {
          caseDetailItems.push({ label: 'Reported By', value: toStr(caseData.reportedBy) });
        }

        if (typeof caseData.isAssigned === 'boolean') {
          const assignedItem = { 
            label: 'Assigned', 
            value: caseData.isAssigned ? 'Yes' : 'No'
          };
          // Make "No" clickable for police/volunteer when case is not assigned
          if (!caseData.isAssigned && (userRole === 'police' || userRole === 'volunteer') && isAuthenticated) {
            assignedItem.isClickable = true;
          }
          caseDetailItems.push(assignedItem);
        }
        if (caseData.addedBy) {
          const item = { 
            label: 'Added By', 
            value: toStr(caseData.addedBy)
          };
          
          // Only add link for police and volunteers
          if (userRole === 'police' || userRole === 'volunteer') {
            item.link = `/caseOwnerProfile?caseOwner=${caseData.caseOwner}`;
          }
          
          caseDetailItems.push(item);
        }
        if (caseDetailItems.length) sections.push({ title: 'Case Details', items: caseDetailItems });

        // Location
        const locationItems = [];
        if (caseData.city) locationItems.push({ label: 'City', value: toStr(caseData.city) });
        if (caseData.postalCode) locationItems.push({ label: 'Postal code', value: toStr(caseData.postalCode) });
        if (caseData.state) locationItems.push({ label: 'State', value: toStr(caseData.state) });
        if (caseData.country) locationItems.push({ label: 'Country', value: toStr(caseData.country) });
        if (caseData.landMark) locationItems.push({ label: 'Landmark', value: toStr(caseData.landMark), fullWidth: true });
        if (locationItems.length) sections.push({ title: 'Location', items: locationItems });

        // Police Station
        const policeStationItems = [];
        if (caseData.FIRNumber) policeStationItems.push({ label: 'Case Reference Number', value: toStr(caseData.FIRNumber) });
        if (caseData.caseRegisterDate) policeStationItems.push({ label: 'Case Registered On', value: formatDate(caseData.caseRegisterDate) });
        if (caseData.policeStationName) policeStationItems.push({ label: 'Police Station Name', value: toStr(caseData.policeStationName) });
        if (caseData.policeStationCity) policeStationItems.push({ label: 'Police Station City', value: toStr(caseData.policeStationCity) });
        if (caseData.policeStationState) policeStationItems.push({ label: 'Police Station State', value: toStr(caseData.policeStationState) });
        if (caseData.policeStationCountry) policeStationItems.push({ label: 'Police Station Country', value: toStr(caseData.policeStationCountry) });
        if (caseData.policeStationPostalCode) policeStationItems.push({ label: 'Police Station Postal code', value: toStr(caseData.policeStationPostalCode) });
        if (policeStationItems.length) sections.push({ title: 'Police Station', items: policeStationItems });

        return sections;
      })(),
    };

    return res.status(200).json({ success: true, data: transformed });
  } catch (error) {
    console.error("Error fetching case by id:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch case", error: error.message });
  }
};


