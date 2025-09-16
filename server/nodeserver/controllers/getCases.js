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
      city = null,
      status = undefined,
      gender = undefined,
      dateFrom = undefined,
      dateTo = undefined,
      keyword = undefined
    } = req.query;

    // Convert page and limit to numbers
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Normalize helper
    const isAllOrEmpty = (val) => !val || val === "" || val === "null" || (typeof val === "string" && val.toLowerCase() === "all");

    // Build filter object - start with country only
    const filter = {
      country: country
    };

    // Add state filter only if provided and not "all"
    if (!isAllOrEmpty(state)) {
      filter.state = state;
    }

    // Add city filter only if provided and not "all"
    if (!isAllOrEmpty(city)) {
      filter.city = city;
    }

    // Add status filter when provided (missing | found | closed)
    if (!isAllOrEmpty(status)) {
      filter.status = status;
    }

    // Add gender filter when provided (male | female | other)
    if (!isAllOrEmpty(gender)) {
      filter.gender = gender;
    }

    // Add date range filter when provided
    if (dateFrom || dateTo) {
      filter.dateMissingFound = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          filter.dateMissingFound.$gte = fromDate;
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          filter.dateMissingFound.$lte = toDate;
        }
      }
    }

    // Always show only cases where showCase is true
    filter.showCase = true;

    // Apply keyword search across allowed fields
    let keywordQuery = null;
    if (keyword && typeof keyword === "string" && keyword.trim().length > 0) {
      const regex = new RegExp(keyword.trim(), "i");
      keywordQuery = {
        $or: [
          { fullName: regex },
          { FIRNumber: regex }
        ]
      };
    }

    const finalQuery = keywordQuery ? { $and: [filter, keywordQuery] } : filter;

    // Get total count for pagination
    const totalCases = await Case.countDocuments(finalQuery);
    const totalPages = Math.ceil(totalCases / limitNumber);

    // Fetch cases with pagination
    const cases = await Case.find(finalQuery)
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
          const key = `${countryPath}/${caseData._id}_${i}.jpg`;
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
        FIRNumber: caseData.FIRNumber,
        status: caseData.status,
        city: caseData.city,
        state: caseData.state,
        country: caseData.country,
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
        state: isAllOrEmpty(state) ? null : state,
        city: isAllOrEmpty(city) ? null : city,
        status: isAllOrEmpty(status) ? undefined : status,
        gender: isAllOrEmpty(gender) ? undefined : gender,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        keyword: keyword || undefined
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
