import express from "express";
import { requireAuth, clerkClient } from "@clerk/express";
import User from "../model/userModel.js";
import Case from "../model/caseModel.js";
import { getPresignedGetUrl } from "../services/s3Service.js";
import { config } from "../config/config.js";

const router = express.Router();

router.post("/users/profile", requireAuth(), async (req, res) => {
    try {
        const { userId } = req.auth || {};
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const {
            fullName,
            phoneNumber,
            governmentIdNumber,
            role,
            gender,
            dateOfBirth,
            address,
            city,
            state,
            country,
            pincode,
        } = req.body || {};

        const update = {
            ...(fullName !== undefined ? { fullName } : {}),
            ...(phoneNumber !== undefined ? { phoneNumber } : {}),
            ...(governmentIdNumber !== undefined ? { governmentIdNumber } : {}),
            ...(role !== undefined ? { 
                // For police users, save as general_user in MongoDB until verified
                role: role === 'police' ? 'general_user' : role 
            } : {}),
            ...(gender !== undefined ? { gender } : {}),
            ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
            ...(address !== undefined ? { address } : {}),
            ...(city !== undefined ? { city } : {}),
            ...(state !== undefined ? { state } : {}),
            ...(country !== undefined ? { country } : {}),
            ...(pincode !== undefined ? { pincode } : {}),
            onboardingCompleted: true,
            ipAddress: (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip,
        };

        // Check if onboarding was just completed (to send welcome email)
        const existingUser = await User.findOne({ clerkUserId: userId }).select('onboardingCompleted email').lean();
        const wasOnboardingCompleted = existingUser?.onboardingCompleted || false;
        let isJustCompletingOnboarding = !wasOnboardingCompleted && update.onboardingCompleted === true;

        // First try update without upsert
        let user = await User.findOneAndUpdate(
            { clerkUserId: userId },
            { $set: update },
            { new: true, upsert: false }
        );

        if (!user) {
            // Upsert in case the minimal user doc was not created yet; require email to satisfy schema
            let setOnInsert = { clerkUserId: userId };
            try {
                const clerkUser = await clerkClient.users.getUser(userId);
                const email = clerkUser?.primaryEmailAddress?.emailAddress || clerkUser?.emailAddresses?.[0]?.emailAddress || "";
                if (!email) {
                    return res.status(409).json({ success: false, message: "Unable to provision profile (missing email). Please refresh and try again." });
                }
                setOnInsert = { ...setOnInsert, email };
            } catch (e) {
                return res.status(502).json({ success: false, message: "Failed to fetch identity. Please try again." });
            }

            user = await User.findOneAndUpdate(
                { clerkUserId: userId },
                { $set: update, $setOnInsert: setOnInsert },
                { new: true, upsert: true }
            );
            
            // For new users, onboarding completion is true immediately
            if (update.onboardingCompleted === true) {
                isJustCompletingOnboarding = true;
            }
        }

        // Update Clerk public metadata with onboarding status and role
        try {
            const clerkMetadata = {
                onboardingCompleted: true,
                lastUpdated: new Date().toISOString()
            };

            // Handle police role verification
            if (role === 'police') {
                // Set role as general_user and add verification status
                clerkMetadata.role = 'general_user';
                clerkMetadata.isVerified = false;
                // Also store in MongoDB for efficient querying
                update.isVerified = false;
            } else {
                // Normal flow for non-police users → clamp to allowed Clerk roles
                const allowedClerkRoles = new Set(['general_user', 'NGO', 'volunteer']);
                const existingRole = user?.role;
                clerkMetadata.role = allowedClerkRoles.has(existingRole) ? existingRole : 'general_user';
                // isVerified is null for non-police users
                update.isVerified = null;
            }

            await clerkClient.users.updateUserMetadata(userId, {
                publicMetadata: clerkMetadata
            });
        } catch (error) {
            console.error('Failed to update Clerk metadata:', error);
            // Don't fail the request if metadata update fails
        }

        // Send welcome email when onboarding is just completed (non-blocking)
        if (isJustCompletingOnboarding && user?.email) {
            try {
                const { sendEmailNotificationAsync } = await import('../services/emailService.js');
                await sendEmailNotificationAsync(
                    user.email,
                    'Welcome to Reunait! 👋',
                    "We're thrilled to have you join our community dedicated to reuniting families. Reunait empowers you to make a meaningful difference by registering missing person reports, uploading found person cases, and helping identify matches in our network. Our platform connects verified volunteers, NGOs, law enforcement partners, and community members to create a powerful network of support. Together, we can help bring families back together.",
                    {
                        notificationType: 'welcome',
                        userId: userId,
                        navigateTo: '/register-case',
                    }
                );
            } catch (error) {
                // Don't fail the request if email fails
                // Error is already logged in emailService
            }
        }

        // Return sanitized user data (same as GET endpoint)
        const {
            email: userEmail,
            fullName: userFullName,
            governmentIdNumber: userGovId,
            phoneNumber: userPhone,
            address: userAddress,
            dateOfBirth: userDob,
            gender: userGender,
            city: userCity,
            state: userState,
            country: userCountry,
            pincode: userPincode,
            role: userRole,
            cases: userCases,
            notifications: userNotifications,
            onboardingCompleted: userOnboarding,
        } = user;

        // Populate cases and pagination to match GET /users/profile response
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;

        let cases = [];
        let totalCases = 0;
        let hasMoreCases = false;

        if (userCases && userCases.length > 0) {
            // Root-cause fix: include active and flagged cases, exclude closed
            const profileCasesFilter = {
                _id: { $in: userCases },
                status: { $ne: 'closed' },
                $or: [
                    { showCase: true },
                    { isFlagged: true }
                ]
            };

            // Total count for pagination
            totalCases = await Case.countDocuments(profileCasesFilter);
            hasMoreCases = totalCases > skip + limit;

            // Fetch only the fields needed for case cards, with stable sort + pagination
            const casesData = await Case.find(profileCasesFilter)
                .select('_id fullName age gender status city state country dateMissingFound reward reportedBy createdAt isFlagged')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            // Transform cases to include dynamically generated image URLs
            cases = await Promise.all(casesData.map(async (caseData) => {
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

                return {
                    _id: caseData._id,
                    fullName: caseData.fullName,
                    age: caseData.age,
                    gender: caseData.gender,
                    status: caseData.status,
                    city: caseData.city,
                    state: caseData.state,
                    country: caseData.country,
                    dateMissingFound: caseData.dateMissingFound,
                    reward: caseData.reward,
                    reportedBy: caseData.reportedBy,
                    imageUrls: imageUrls,
                    isFlagged: caseData.isFlagged || false
                };
            }));
        }

        return res.json({
            success: true,
            data: {
                email: userEmail,
                fullName: userFullName,
                governmentIdNumber: userGovId,
                phoneNumber: userPhone,
                address: userAddress,
                dateOfBirth: userDob,
                gender: userGender,
                city: userCity,
                state: userState,
                country: userCountry,
                pincode: userPincode,
                role: userRole,
                cases,
                notifications: userNotifications,
                onboardingCompleted: !!userOnboarding,
                casesPagination: {
                    currentPage: page,
                    totalCases,
                    hasMoreCases,
                    casesPerPage: limit
                }
            },
        });
    } catch (err) {
        try { console.error("[POST /api/users/profile]", err) } catch {}
        if (err && err.code === 11000) {
            return res.status(409).json({ success: false, message: "Duplicate value for a unique field", details: err.keyValue });
        }
        if (err && err.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: "Validation failed", details: err.errors });
        }
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// Return current user's profile
router.get("/users/profile", requireAuth(), async (req, res) => {
    try {
        const { userId } = req.auth || {};
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        let user = await User.findOne({ clerkUserId: userId }).lean();
        if (!user) {
            // Fallback: attempt to link by email if clerkUserId changed across environments
            try {
                const cu = await clerkClient.users.getUser(userId);
                const email = cu?.primaryEmailAddress?.emailAddress || cu?.emailAddresses?.[0]?.emailAddress;
                if (email) {
                    const byEmail = await User.findOne({ email }).lean();
                    if (byEmail) {
                        await User.updateOne({ _id: byEmail._id }, { $set: { clerkUserId: userId } });
                        user = await User.findOne({ _id: byEmail._id }).lean();
                    }
                }
            } catch (_) {}
        }
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const onboardingCompleted = !!user.onboardingCompleted;
        if (!onboardingCompleted) {
            return res.json({ success: true, data: { onboardingCompleted: false } });
        }

        // When onboarding is complete, return the full profile (sanitized)
        const {
            email,
            fullName,
            governmentIdNumber,
            phoneNumber,
            address,
            dateOfBirth,
            gender,
            city,
            state,
            country,
            pincode,
            role,
            cases: caseIds,
            notifications,
            onboardingCompleted: oc,
        } = user;

        // Populate cases with pagination (6 cases per page for profile)
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;
        
        let cases = [];
        let totalCases = 0;
        let hasMoreCases = false;
        
        if (caseIds && caseIds.length > 0) {
            // Root-cause fix: include active and flagged cases, exclude closed
            const profileCasesFilter = {
                _id: { $in: caseIds },
                status: { $ne: 'closed' },
                $or: [
                    { showCase: true },
                    { isFlagged: true }
                ]
            };

            // Total count for pagination
            totalCases = await Case.countDocuments(profileCasesFilter);
            hasMoreCases = totalCases > skip + limit;

            // Fetch only the fields needed for case cards, with stable sort + pagination
            const casesData = await Case.find(profileCasesFilter)
                .select('_id fullName age gender status city state country dateMissingFound reward reportedBy createdAt isFlagged')
                .sort({ createdAt: -1 }) // Most recent first
                .skip(skip)
                .limit(limit)
                .lean();

            // Transform cases to include dynamically generated image URLs
            cases = await Promise.all(casesData.map(async (caseData) => {
                // Generate image URLs using country-based key prefix (same pattern as other APIs)
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

                return {
                    _id: caseData._id,
                    fullName: caseData.fullName,
                    age: caseData.age,
                    gender: caseData.gender,
                    status: caseData.status,
                    city: caseData.city,
                    state: caseData.state,
                    country: caseData.country,
                    dateMissingFound: caseData.dateMissingFound,
                    reward: caseData.reward,
                    reportedBy: caseData.reportedBy,
                    imageUrls: imageUrls, // Dynamically generated S3 URLs
                    isFlagged: caseData.isFlagged || false
                };
            }));
        }

        return res.json({
            success: true,
            data: {
                email,
                fullName,
                governmentIdNumber,
                phoneNumber,
                address,
                dateOfBirth,
                gender,
                city,
                state,
                country,
                pincode,
                role,
                cases,
                notifications,
                onboardingCompleted: !!oc,
                // Pagination info
                casesPagination: {
                    currentPage: page,
                    totalCases,
                    hasMoreCases,
                    casesPerPage: limit
                }
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// GET /api/users/search
// Search users by name, email, or phone number (for police and volunteer users)
router.get("/users/search", requireAuth(), async (req, res) => {
    try {
        const { userId } = req.auth || {};
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // Extract user role from Clerk public metadata
        let userRole = 'general_user';
        try {
            const user = await clerkClient.users.getUser(userId);
            userRole = user.publicMetadata?.role || 'general_user';
        } catch (error) {
            console.error('Failed to get user from Clerk:', error);
            return res.status(500).json({
                success: false,
                message: "Failed to verify user authentication."
            });
        }

        // Only allow police and volunteer users to access this endpoint
        if (userRole !== 'police' && userRole !== 'volunteer') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only police and volunteer users can search users."
            });
        }

        const { query } = req.query;

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        // Validate input length
        if (query.trim().length > 100) {
            return res.status(400).json({
                success: false,
                message: "Search query is too long. Maximum 100 characters allowed."
            });
        }

        // Security: Sanitize regex special characters to prevent regex injection
        const searchTerm = query.trim();
        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Build search query - search across fullName, email, and phoneNumber
        // Exclude the current user from results
        const searchFilter = {
            $and: [
                {
                    $or: [
                        { fullName: { $regex: escapedSearchTerm, $options: 'i' } },
                        { email: { $regex: escapedSearchTerm, $options: 'i' } },
                        { phoneNumber: { $regex: escapedSearchTerm, $options: 'i' } }
                    ]
                },
                ...(userId ? [{ clerkUserId: { $ne: userId } }] : [])
            ]
        };

        // Limit results for autocomplete (20 users max)
        const users = await User.find(searchFilter)
            .select("clerkUserId fullName email phoneNumber gender dateOfBirth")
            .limit(20)
            .lean();

        // Helper function to calculate age from dateOfBirth
        const calculateAge = (dateOfBirth) => {
            if (!dateOfBirth) return null;
            const today = new Date();
            const birthDate = new Date(dateOfBirth);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age >= 0 ? age : null;
        };

        return res.json({
            success: true,
            data: users.map(user => ({
                clerkUserId: user.clerkUserId || "",
                fullName: user.fullName || "",
                email: user.email || "",
                phoneNumber: user.phoneNumber || "",
                gender: user.gender || null,
                age: calculateAge(user.dateOfBirth),
                url: user.clerkUserId ? `/caseOwnerProfile?caseOwner=${encodeURIComponent(user.clerkUserId)}` : null
            }))
        });
    } catch (error) {
        console.error("[GET /api/users/search]", error);
        return res.status(500).json({
            success: false,
            message: "Server error while searching users"
        });
    }
});

router.post("/webhooks/clerk", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: "Missing CLERK_WEBHOOK_SIGNING_SECRET" });
    }

    // Verify with Svix
    const svixId = req.headers["svix-id"]; // string | undefined
    const svixTimestamp = req.headers["svix-timestamp"]; // string | undefined
    const svixSignature = req.headers["svix-signature"]; // string | undefined
    if (!svixId || !svixTimestamp || !svixSignature) {
        console.log("Missing Svix headers");
      return res.status(400).json({ success: false, message: "Missing Svix headers" });
    }

    // Svix expects the exact raw string body
    const payload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body;
    const { Webhook } = await import("svix");
    const wh = new Webhook(secret);
    const evt = wh.verify(payload, {
      "svix-id": String(svixId),
      "svix-timestamp": String(svixTimestamp),
      "svix-signature": String(svixSignature)
    });

    // evt.type e.g., 'user.created', 'user.updated'
    const type = evt?.type;
    const data = evt && evt.data ? evt.data : null;

    if (!type || !data) {
      return res.status(400).json({ success: false, message: "Invalid webhook event" });
    }

    // Handle webhook events for user provisioning and metadata updates
    if (type === "user.created") {
      const clerkUserId = data?.id;
      const emails = Array.isArray(data?.email_addresses) ? data.email_addresses : [];
      const primaryId = data?.primary_email_address_id;
      const primary = emails.find((e) => e?.id === primaryId);
      const email = primary?.email_address || emails[0]?.email_address || "";

      if (clerkUserId) {
        if (email) {
          await User.findOneAndUpdate(
            { clerkUserId },
            { $setOnInsert: { clerkUserId, email, onboardingCompleted: false } },
            { upsert: true, new: false, setDefaultsOnInsert: true }
          );
        }
        try {
          await clerkClient.users.updateUserMetadata(clerkUserId, {
            publicMetadata: {
              onboardingCompleted: false,
              role: 'general_user',
              lastUpdated: new Date().toISOString()
            }
          });
        } catch (error) {
          console.error('Failed to set initial Clerk metadata:', error);
        }
      }
    } else if (type === "user.updated") {
      const clerkUserId = data?.id;
      if (clerkUserId) {
        const emails = Array.isArray(data?.email_addresses) ? data.email_addresses : [];
        const primaryId = data?.primary_email_address_id;
        const primary = emails.find((e) => e?.id === primaryId);
        const email = primary?.email_address || emails[0]?.email_address || "";
        if (email) {
          await User.updateOne(
            { clerkUserId },
            { $set: { email } }
          );
        }
      }
    } else if (type === "user.deleted") {
      const clerkUserId = data?.id;
      if (clerkUserId) {
        // Optionally deactivate or remove user; keep data unless required to delete
        await User.updateOne({ clerkUserId }, { $set: { /* soft-delete flag optional */ } });
      }
    }

    return res.status(204).end();
  } catch (err) {
    return res.status(400).json({ success: false, message: "Invalid signature" });
  }
});

export default router;