import Case from "../model/caseModel.js";
import { getPresignedGetUrl } from "../services/s3Service.js";
import { config } from "../config/config.js";

export const getCases = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 40, 
      country = "India", 
      state = null, 
      city = null 
    } = req.query;

    // Convert page and limit to numbers
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build filter object - start with country only
    const filter = {
      country: country
    };

    // Add state filter only if provided and not "all"
    if (state && state !== "null" && state !== "" && state !== "all") {
      filter.state = state;
    }

    // Add city filter only if provided and not "all"
    if (city && city !== "null" && city !== "" && city !== "all") {
      filter.city = city;
    }

    // Get total count for pagination
    const totalCases = await Case.countDocuments(filter);
    const totalPages = Math.ceil(totalCases / limitNumber);

    // Fetch cases with pagination
    const cases = await Case.find(filter)
      .sort({ createdAt: -1 }) // Latest cases first
      .skip(skip)
      .limit(limitNumber)
      .select('-notifications') // Exclude notifications for performance
      .lean(); // Convert to plain JavaScript objects for better performance

    // Transform data to match frontend expectations and generate S3 URLs
    const transformedCases = await Promise.all(cases.map(async (caseData) => {
      // Generate S3 keys for both images using country-based prefix (no extension)
      const countryPath = (caseData.country || 'India').replace(/\s+/g, '_').toLowerCase();
      const imageUrls = [];
      
      try {
        for (let i = 1; i <= 2; i++) {
          const key = `${countryPath}/${caseData._id}_${i}`;
          try {
            const imageUrl = await getPresignedGetUrl(config.awsBucketName, key, 180);
            imageUrls.push(imageUrl);
          } catch (error) {
            // Failed to generate URL for this image
          }
        }
      } catch (error) {
        // Error in image URL generation for this case
      }

      return {
        _id: caseData._id,
        fullName: caseData.fullName,
        age: caseData.age,
        gender: caseData.gender,
        status: caseData.status,
        city: caseData.city,
        state: caseData.state,
        dateMissingFound: caseData.dateMissingFound,
        reward: caseData.reward,
        reportedBy: caseData.reportedBy,
        imageUrls: imageUrls // Array of S3 URLs
      };
    }));



    // Return response with pagination metadata
    res.status(200).json({
      success: true,
      data: transformedCases,
      pagination: {
        currentPage: pageNumber,
        totalPages: totalPages,
        totalCases: totalCases,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
        limit: limitNumber
      },
      filters: {
        country,
        state: state || null,
        city: city || null
      }
    });

  } catch (error) {
    console.error("Error fetching cases:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cases",
      error: error.message
    });
  }
};
