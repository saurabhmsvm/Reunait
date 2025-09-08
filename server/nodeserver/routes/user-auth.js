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
            ...(role !== undefined ? { role } : {}),
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
        }

        // Update Clerk public metadata with onboarding status and role
        try {
            await clerkClient.users.updateUserMetadata(userId, {
                publicMetadata: {
                    onboarding: true,
                    role: user.role || 'general_user',
                    lastUpdated: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Failed to update Clerk metadata:', error);
            // Don't fail the request if metadata update fails
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
                cases: userCases,
                notifications: userNotifications,
                onboardingCompleted: !!userOnboarding,
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
            totalCases = caseIds.length;
            hasMoreCases = totalCases > skip + limit;
            
            // Get paginated case IDs
            const paginatedCaseIds = caseIds.slice(skip, skip + limit);
            
            // Fetch only the fields needed for case cards
            const casesData = await Case.find({ _id: { $in: paginatedCaseIds } })
                .select('_id fullName age gender status city state country dateMissingFound reward reportedBy createdAt')
                .sort({ createdAt: -1 }) // Most recent first
                .lean();

            // Transform cases to include dynamically generated image URLs
            cases = await Promise.all(casesData.map(async (caseData) => {
                // Generate image URLs using country-based key prefix (same pattern as other APIs)
                const imageUrls = [];
                try {
                    const countryPath = (caseData.country || "India").replace(/\s+/g, '_').toLowerCase();
                    for (let i = 1; i <= 2; i++) {
                        const key = `${countryPath}/${caseData._id}_${i}`;
                        try {
                            const imageUrl = await getPresignedGetUrl(config.awsBucketName, key, 180);
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
                    imageUrls: imageUrls // Dynamically generated S3 URLs
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
      const email = data?.email_addresses?.[0]?.email_address || data?.primary_email_address_id || "";

      if (clerkUserId) {
        // 1. Create MongoDB record
        await User.findOneAndUpdate(
          { clerkUserId },
          { $setOnInsert: { clerkUserId, email, onboardingCompleted: false } },
          { upsert: true, new: false, setDefaultsOnInsert: true }
        );
        
        // 2. Set initial Clerk metadata
        try {
          await clerkClient.users.updateUserMetadata(clerkUserId, {
            publicMetadata: {
              onboarding: false,
              role: null,
              lastUpdated: new Date().toISOString()
            }
          });
        } catch (error) {
          console.error('Failed to set initial Clerk metadata:', error);
          // Don't fail the webhook if metadata update fails
        }
      }
    } else if (type === "user.updated") {
      const clerkUserId = data?.id;
      if (clerkUserId) {
        const email = data?.email_addresses?.[0]?.email_address || "";
        await User.updateOne(
          { clerkUserId },
          { $set: { email } }
        );
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


