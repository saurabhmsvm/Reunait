/**
 * Email Template Mapper
 * Maps notification types to React Email template props
 */

import Case from '../model/caseModel.js';
import { config } from '../config/config.js';
import { formatLocation } from '../lib/helpers.js';

/**
 * Get template props for a notification type
 * @param {string} notificationType - Type of notification
 * @param {object} data - Notification data (caseId, caseData, etc.)
 * @returns {Promise<object>} Template props for ReunaitEmail component
 */
export async function getTemplateProps(notificationType, data = {}) {
  // Lazy access to config to avoid initialization issues
  const { config: appConfig } = await import('../config/config.js');
  const baseUrl = appConfig.frontendUrl;
  
  // Helper to build full URL
  const buildUrl = (path) => {
    if (!path) return null;
    return path.startsWith('http') ? path : `${baseUrl}${path}`;
  };

  // Helper to format date (date only, no time)
  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };


  // Fetch case data if caseId provided but caseData not provided
  let caseData = data.caseData;
  if (data.caseId && !caseData) {
    // Only try to fetch if caseId looks like a valid MongoDB ObjectId (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(data.caseId);
    if (isValidObjectId) {
      try {
        caseData = await Case.findById(data.caseId).lean();
      } catch (error) {
        console.error(`[Email Template] Failed to fetch case ${data.caseId}:`, error);
      }
    } else {
      // Skip database fetch for test/invalid IDs
      console.log(`[Email Template] Skipping database fetch for test caseId: ${data.caseId}`);
    }
  }

  const templateConfigs = {
    case_registered: {
      variant: 'success',
      preheader: 'Your case is now live on the platform',
      title: 'Case Registered Successfully',
      subtitle: '',
      message: (() => {
        const caseStatus = caseData?.status || caseData?.originalStatus || data.status || 'missing';
        const reportType = caseStatus === 'found' ? 'found person report' : 'missing person report';
        return `Your ${reportType} for ${data.fullName || caseData?.fullName || 'your case'} has been successfully registered and is now active in our system. Our community of verified volunteers and law enforcement partners will be notified immediately.`;
      })(),
      caseName: data.fullName || caseData?.fullName,
      age: data.age || caseData?.age,
      gender: data.gender || caseData?.gender,
      location: formatLocation(caseData?.city, caseData?.state, caseData?.country) || data.lastSeenLocation || null,
      date: formatDate(caseData?.dateMissingFound || new Date()),
      ctaText: 'View Case',
      ctaUrl: buildUrl(`/cases/${data.caseId || caseData?._id}`),
      secondaryText: null,
      secondaryUrl: null,
    },

    case_closed: {
      variant: data.reunited ? 'celebration' : 'info',
      preheader: data.reunited ? 'Family reunited! 🎉' : 'Case status update',
      title: data.reunited ? 'Case Closed - Family Reunited! 🎉' : 'Case Closed',
      subtitle: data.reunited ? "We're thrilled to share this wonderful news" : 'Your case has been marked as closed',
      message: data.reunited
        ? `Your case for ${caseData?.fullName || 'your case'} has been closed - Family reunited! 🎉`
        : `Your case for ${caseData?.fullName || 'your case'} has been closed.`,
      caseName: caseData?.fullName,
      age: caseData?.age,
      gender: caseData?.gender,
      location: formatLocation(caseData?.city, caseData?.state, caseData?.country) || null,
      date: formatDate(caseData?.dateMissingFound || new Date()),
      ctaText: null, // No buttons for closed cases
      ctaUrl: null,
      secondaryText: null,
      secondaryUrl: null,
    },

    case_assigned: {
      variant: 'success',
      preheader: 'Action required - Case assigned to you',
      title: 'Case Assigned to You',
      subtitle: 'Please review and take necessary action',
      message: 'A case has been assigned to you. Please review the details and take necessary action.',
      caseName: caseData?.fullName,
      age: caseData?.age,
      gender: caseData?.gender,
      location: formatLocation(caseData?.city, caseData?.state, caseData?.country) || null,
      date: formatDate(caseData?.dateMissingFound || new Date()),
      ctaText: 'Review Case',
      ctaUrl: buildUrl(`/cases/${data.caseId || caseData?._id}`),
      secondaryText: null,
      secondaryUrl: null,
    },

    case_assignment_confirmed: {
      variant: 'success',
      preheader: 'Assignment confirmed',
      title: 'Case Assignment Confirmed',
      subtitle: 'Case has been successfully assigned',
      message: `Case has been successfully assigned to ${data.targetUserName || data.targetUserEmail || 'the user'}.`,
      caseName: caseData?.fullName,
      age: caseData?.age,
      gender: caseData?.gender,
      location: formatLocation(caseData?.city, caseData?.state, caseData?.country) || null,
      date: formatDate(caseData?.dateMissingFound || new Date()),
      ctaText: 'View Case',
      ctaUrl: buildUrl(`/cases/${data.caseId || caseData?._id}`),
      secondaryText: null,
      secondaryUrl: null,
    },

    case_reported: {
      variant: 'info',
      preheader: 'New tip received',
      title: 'New Tip Received',
      subtitle: 'Someone has submitted information about your case',
      message: `A new tip has been received for ${caseData?.fullName || 'your case'}. This information is now available in our system for our verified volunteers and law enforcement partners to review. We recommend visiting your nearest police station to seek assistance and provide any additional information you may have about this tip.`,
      caseName: caseData?.fullName,
      age: caseData?.age,
      gender: caseData?.gender,
      location: formatLocation(caseData?.city, caseData?.state, caseData?.country) || null,
      date: formatDate(caseData?.dateMissingFound || new Date()),
      ctaText: 'Review Tip',
      ctaUrl: buildUrl(`/cases/${data.caseId || caseData?._id}`),
      secondaryText: null,
      secondaryUrl: null,
    },

    case_flagged: {
      variant: 'alert',
      preheader: 'Case flagged - Review needed',
      title: 'Case Flagged and Hidden',
      subtitle: 'Your case requires immediate attention',
      message: `Your case '${caseData?.fullName || "Unknown"}' has been flagged and hidden due to multiple reports.`,
      caseName: caseData?.fullName,
      age: caseData?.age,
      gender: caseData?.gender,
      location: formatLocation(caseData?.city, caseData?.state, caseData?.country) || null,
      date: formatDate(caseData?.dateMissingFound || new Date()),
      ctaText: 'Review Case Status',
      ctaUrl: buildUrl(`/cases/${data.caseId || caseData?._id}`),
      secondaryText: null,
      secondaryUrl: null,
    },

    case_removed: {
      variant: 'alert',
      preheader: 'Important: Case removed',
      title: 'Case Removed Due to Violations',
      subtitle: 'Your case was removed due to guideline violations',
      message: `Your case '${caseData?.fullName || ""}' was removed due to guideline violations.`,
      caseName: caseData?.fullName,
      age: caseData?.age,
      gender: caseData?.gender,
      location: formatLocation(caseData?.city, caseData?.state, caseData?.country) || null,
      date: formatDate(caseData?.dateMissingFound || new Date()),
      ctaText: 'View Profile',
      ctaUrl: buildUrl('/profile'),
      secondaryText: null,
      secondaryUrl: null,
    },

    welcome: {
      variant: 'success',
      preheader: 'Welcome to Reunait!',
      title: 'Thank you for joining us',
      subtitle: 'Empowering communities to reunite families and restore hope',
      message: "We're thrilled to have you join our community dedicated to reuniting families. Reunait empowers you to make a meaningful difference by registering missing person reports, uploading found person cases, and helping identify matches in our network. Our platform connects verified volunteers, NGOs, law enforcement partners, and community members to create a powerful network of support. Together, we can help bring families back together.",
      caseName: null, // No metadata for welcome email
      age: null,
      gender: null,
      location: null,
      date: null,
      ctaText: 'Get Started',
      ctaUrl: buildUrl('/register-case'),
      secondaryText: null,
      secondaryUrl: null,
    },
  };

  const config = templateConfigs[notificationType];
  
  if (!config) {
    console.warn(`[Email Template] Unknown notification type: ${notificationType}, using default`);
    return {
      variant: 'info',
      preheader: 'Notification from Reunait',
      title: 'Notification',
      subtitle: '',
      message: data.message || 'You have a new notification.',
      caseName: null,
      age: null,
      gender: null,
      location: null,
      date: null,
      ctaText: data.navigateTo ? 'View Details' : null,
      ctaUrl: buildUrl(data.navigateTo),
      secondaryText: null,
      secondaryUrl: null,
    };
  }

  return config;
}

