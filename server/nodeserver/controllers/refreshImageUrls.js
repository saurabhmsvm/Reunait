import { getPresignedGetUrl } from "../services/s3Service.js";
import { config } from "../config/config.js";
import Case from "../model/caseModel.js";
import { PRESIGNED_URL_EXPIRY } from "../services/s3Service.js";

/**
 * Batch refresh presigned URLs for case images
 * POST /api/cases/images/refresh-urls
 * Body: { requests: [{ caseId, imageIndex }] }
 */
export const refreshImageUrls = async (req, res) => {
  try {
    const { requests } = req.body;

    // Validate input
    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid request. 'requests' must be a non-empty array.",
      });
    }

    // Limit batch size to prevent abuse
    const MAX_BATCH_SIZE = 50;
    if (requests.length > MAX_BATCH_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} requests.`,
      });
    }

    // Validate each request
    for (const request of requests) {
      if (!request.caseId || typeof request.imageIndex !== "number" || request.imageIndex < 1 || request.imageIndex > 2) {
        return res.status(400).json({
          success: false,
          message: "Each request must have 'caseId' (string) and 'imageIndex' (1 or 2).",
        });
      }
    }

    // Process requests in parallel
    const results = await Promise.allSettled(
      requests.map(async ({ caseId, imageIndex }) => {
        try {
          // Verify case exists
          const caseData = await Case.findById(caseId).lean();
          if (!caseData) {
            return {
              caseId,
              imageIndex,
              success: false,
              error: "Case not found",
            };
          }

          // Generate S3 key using country-based prefix
          const countryPath = (caseData.country || "India").replace(/\s+/g, "_").toLowerCase();
          const key = `${countryPath}/${caseId}_${imageIndex}.jpg`;

          // Generate new presigned URL using standard expiry
          const newUrl = await getPresignedGetUrl(config.awsBucketName, key);

          return {
            caseId,
            imageIndex,
            success: true,
            url: newUrl,
          };
        } catch (error) {
          console.error(`Error refreshing URL for case ${caseId}, image ${imageIndex}:`, error);
          return {
            caseId,
            imageIndex,
            success: false,
            error: error.message || "Failed to generate URL",
          };
        }
      })
    );

    // Format response
    const responses = results.map((result) =>
      result.status === "fulfilled" ? result.value : {
        caseId: "unknown",
        imageIndex: 0,
        success: false,
        error: result.reason?.message || "Unknown error",
      }
    );

    // Count successes
    const successCount = responses.filter((r) => r.success).length;

    res.json({
      success: true,
      message: `Refreshed ${successCount} of ${responses.length} URLs.`,
      data: responses,
      // Include expiry time so frontend can use it for proactive refresh
      expirySeconds: PRESIGNED_URL_EXPIRY.IMAGE_VIEWING,
    });
  } catch (error) {
    console.error("Error in refreshImageUrls:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

