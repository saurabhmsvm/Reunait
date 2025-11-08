/**
 * Email Service using Resend
 * Handles email notifications with proper error handling, idempotency, and retry logic
 * Following industry best practices and Resend documentation recommendations
 */

import { Resend } from 'resend';
import { config } from '../config/config.js';
import crypto from 'crypto';
import { getTemplateProps } from './emailTemplateMapper.js';

// Initialize Resend client
let resendClient = null;

/**
 * Initialize Resend client (lazy initialization)
 * @returns {Resend|null} Resend client instance or null if not configured
 */
function getResendClient() {
  if (!config.resend?.apiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(config.resend.apiKey);
  }

  return resendClient;
}

/**
 * Generate idempotency key to prevent duplicate emails
 * Format: {userId}-{notificationType}-{timestamp}-{hash}
 * @param {string} userId - User ID
 * @param {string} notificationType - Type of notification
 * @param {string} additionalData - Additional data for uniqueness
 * @returns {string} Idempotency key
 */
function generateIdempotencyKey(userId, notificationType, additionalData = '') {
  const timestamp = Date.now();
  const data = `${userId}-${notificationType}-${timestamp}-${additionalData}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  return `${userId}-${notificationType}-${timestamp}-${hash}`;
}

/**
 * Retry with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise<any>} Function result
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors (invalid email, auth errors)
      if (error?.statusCode === 422 || error?.statusCode === 401 || error?.statusCode === 403) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff: delay = baseDelay * 2^attempt
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Handle Resend API errors
 * @param {Error} error - Error object from Resend
 * @returns {object} Formatted error information
 */
function handleEmailError(error) {
  const errorInfo = {
    message: error?.message || 'Unknown error',
    statusCode: error?.statusCode || 500,
    code: error?.code || 'UNKNOWN_ERROR',
  };

  // Map Resend error codes to user-friendly messages
  if (error?.statusCode === 422) {
    errorInfo.message = 'Invalid email address or email format';
    errorInfo.code = 'INVALID_EMAIL';
  } else if (error?.statusCode === 429) {
    errorInfo.message = 'Rate limit exceeded. Please try again later.';
    errorInfo.code = 'RATE_LIMIT';
  } else if (error?.statusCode === 401 || error?.statusCode === 403) {
    errorInfo.message = 'Authentication failed. Please check API key.';
    errorInfo.code = 'AUTH_ERROR';
  }

  return errorInfo;
}

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Send email notification via Resend
 * @param {string} toEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} message - Email message body (plain text or HTML)
 * @param {object} options - Additional options
 * @param {string} options.notificationType - Type of notification (for idempotency)
 * @param {string} options.userId - User ID (for idempotency)
 * @param {string} options.navigateTo - Optional URL to include in email
 * @param {string} options.caseId - Optional case ID for context
 * @param {boolean} options.isHtml - Whether message is HTML (default: false)
 * @returns {Promise<{success: boolean, messageId?: string, error?: object}>}
 */
export async function sendEmailNotification(toEmail, subject, message, options = {}) {
  // Validate configuration
  if (!config.resend?.apiKey) {
    return {
      success: false,
      error: {
        message: 'Email service not configured',
        code: 'NOT_CONFIGURED',
      },
    };
  }

  // Validate email address
  if (!isValidEmail(toEmail)) {
    return {
      success: false,
      error: {
        message: 'Invalid email address',
        code: 'INVALID_EMAIL',
      },
    };
  }

  // Validate required fields
  if (!subject || !message) {
    return {
      success: false,
      error: {
        message: 'Missing required fields',
        code: 'MISSING_FIELDS',
      },
    };
  }

  const client = getResendClient();
  if (!client) {
    return {
      success: false,
      error: {
        message: 'Email client not initialized',
        code: 'CLIENT_ERROR',
      },
    };
  }

  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey(
    options.userId || 'unknown',
    options.notificationType || 'notification',
    options.caseId || ''
  );

  // Prepare email payload
  // Format: "Display Name <email@domain.com>" or just "email@domain.com"
  const fromAddress = config.resend.fromName
    ? `${config.resend.fromName} <${config.resend.fromAddress}>`
    : config.resend.fromAddress;

  let emailPayload = {
    from: fromAddress,
    to: [toEmail],
    subject: subject,
  };

  // Use Resend Template (recommended) if notificationType is provided
  if (options.notificationType) {
    try {
      // Build template variables from template props
      const templateProps = await getTemplateProps(options.notificationType, {
        caseId: options.caseId,
        caseData: options.caseData,
        fullName: options.fullName,
        age: options.age,
        gender: options.gender,
        lastSeenLocation: options.lastSeenLocation,
        reunited: options.reunited,
        targetUserName: options.targetUserName,
        targetUserEmail: options.targetUserEmail,
        navigateTo: options.navigateTo,
        message: message,
      });

      // Select template ID based on variant
      // Variant mapping: success/celebration -> green, info -> blue, alert -> red, welcome -> welcome template
      const variant = templateProps.variant || 'info';
      let templateId = null;
      
      // Welcome emails use dedicated welcome template
      if (options.notificationType === 'welcome') {
        templateId = config?.resendTemplates?.welcome || null;
      } else if (variant === 'success' || variant === 'celebration') {
        templateId = config?.resendTemplates?.green || null;
      } else if (variant === 'info') {
        templateId = config?.resendTemplates?.blue || null;
      } else if (variant === 'alert' || variant === 'warning') {
        templateId = config?.resendTemplates?.red || null;
      }

      if (!templateId) {
        throw new Error(`No template ID found for variant: ${variant}`);
      }

      // Uppercase variable keys to align with Resend docs recommendation
      // For welcome emails, don't include case metadata (no case data)
      const isWelcomeEmail = options.notificationType === 'welcome';
      const variables = {
        PREHEADER: templateProps.preheader || '',
        TITLE: templateProps.title || '',
        SUBTITLE: templateProps.subtitle || '',
        MESSAGE: templateProps.message || '',
        YEAR: templateProps.year || new Date().getFullYear().toString(),
      };

      // Only include case metadata if not welcome email and values exist
      if (!isWelcomeEmail) {
        if (templateProps.caseName) variables.CASE_NAME = templateProps.caseName;
        if (templateProps.age) variables.AGE = templateProps.age;
        if (templateProps.gender) variables.GENDER = templateProps.gender;
        if (templateProps.location) variables.LOCATION = templateProps.location;
        if (templateProps.date) variables.DATE = templateProps.date;
      }

      emailPayload = {
        ...emailPayload,
        // subject/from can override template defaults per Resend docs
        template: {
          id: templateId,
          variables,
        },
      };
    } catch (error) {
      // Fallback to plain text if template fails
      let emailContent = message;
      if (options.navigateTo) {
        const baseUrl = config.frontendUrl;
        const fullUrl = options.navigateTo.startsWith('http') 
          ? options.navigateTo 
          : `${baseUrl}${options.navigateTo}`;
        emailContent += `\n\nView Details: ${fullUrl}`;
      }
      emailPayload.text = emailContent;
    }
  } else {
    // Legacy: Plain text or HTML message (backward compatibility)
    let emailContent = message;

    // Add navigation link if provided
    if (options.navigateTo) {
      const baseUrl = config.frontendUrl;
      const fullUrl = options.navigateTo.startsWith('http') 
        ? options.navigateTo 
        : `${baseUrl}${options.navigateTo}`;
      
      if (options.isHtml) {
        emailContent += `<br><br><a href="${fullUrl}" style="color: #007bff; text-decoration: none;">View Details →</a>`;
      } else {
        emailContent += `\n\nView Details: ${fullUrl}`;
      }
    }

    if (options.isHtml) {
      emailPayload.html = emailContent;
    } else {
      emailPayload.text = emailContent;
    }
  }

  try {
    // Send email with retry logic
    const result = await retryWithBackoff(async () => {
      const response = await client.emails.send(emailPayload, {
        idempotencyKey: idempotencyKey,
      });

      // Resend returns error objects, not exceptions
      if (response.error) {
        const error = new Error(response.error.message);
        error.statusCode = response.error.statusCode;
        error.code = response.error.name;
        throw error;
      }

      return response;
    });

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    const errorInfo = handleEmailError(error);

    return {
      success: false,
      error: errorInfo,
    };
  }
}

/**
 * Send email notification (non-blocking wrapper)
 * This function doesn't throw errors and can be used in fire-and-forget scenarios
 * @param {string} toEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} message - Email message body
 * @param {object} options - Additional options
 * @returns {Promise<void>}
 */
export async function sendEmailNotificationAsync(toEmail, subject, message, options = {}) {
  try {
    await sendEmailNotification(toEmail, subject, message, options);
  } catch (error) {
    // This should never happen as sendEmailNotification doesn't throw,
    // but adding as safety net
  }
}

