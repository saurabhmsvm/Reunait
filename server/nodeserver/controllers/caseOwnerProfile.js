import { clerkClient } from "@clerk/express";
import User from "../model/userModel.js";
import Case from "../model/caseModel.js";
import { getPresignedGetUrl } from "../services/s3Service.js";
import { config } from "../config/config.js";

export const getCaseOwnerProfile = async (req, res) => {
  try {
    // Check if user is authenticated (required by requireAuth middleware)
    const { userId } = req.auth || {};
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized. Please sign in to access this resource." 
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
        message: "Access denied. Only police and volunteer users can view case owner profiles." 
      });
    }

    // Get caseOwner from query parameters
    const { caseOwner } = req.query;
    if (!caseOwner) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required parameter: caseOwner" 
      });
    }


    // Get the case owner's profile from MongoDB only
    const user = await User.findOne({ clerkUserId: caseOwner }).lean();
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Case owner profile not found." 
      });
    }

    // Get profile picture URL from Clerk
    let profileImageUrl = null;
    try {
      const clerkUser = await clerkClient.users.getUser(caseOwner);
      profileImageUrl = clerkUser.imageUrl || null;
    } catch (error) {
      // If we can't get the image from Clerk, continue without it
      console.error('Failed to get profile image from Clerk:', error);
    }

    // Extract profile data (same structure as /users/profile endpoint)
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
      ipAddress,
    } = user;

    // Populate cases with pagination (same as /users/profile endpoint)
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    
    let cases = [];
    let totalCases = 0;
    let hasMoreCases = false;
    
    if (caseIds && caseIds.length > 0) {
      // Show active and flagged cases, exclude closed (same as /users/profile)
      const filter = {
        _id: { $in: caseIds },
        status: { $ne: 'closed' },
        $or: [
          { showCase: true },
          { isFlagged: true }
        ]
      };

      // Total count and pagination
      totalCases = await Case.countDocuments(filter);
      hasMoreCases = totalCases > skip + limit;

      // Fetch only the fields needed for case cards
      const casesData = await Case.find(filter)
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
          isFlagged: caseData.isFlagged || false,
          imageUrls: imageUrls // Dynamically generated S3 URLs
        };
      }));
    }

    const profileData = {
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
      ipAddress,
      profileImageUrl,
      cases: cases,
      casesPagination: {
        currentPage: page,
        totalCases: totalCases,
        hasMoreCases: hasMoreCases,
        casesPerPage: limit
      }
    };

    return res.status(200).json({ 
      success: true, 
      data: profileData 
    });

  } catch (error) {
    console.error("Error fetching case owner profile:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch case owner profile", 
      error: error.message 
    });
  }
};
