import express from 'express';
import Case from '../model/caseModel.js';
import { searchSimilarCases } from '../services/pineconeService.js';
import { getPresignedGetUrl } from '../services/s3Service.js';
import { config } from '../config/config.js';

const router = express.Router();

// Test endpoint to check if server is running
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Find Matches API is running',
    timestamp: new Date().toISOString()
  });
});

// Find Similar Cases endpoint
router.post('/find-matches', async (req, res) => {
  try {
    const { caseId, gender, status, country, date } = req.body;

    // Validate required parameters
    if (!caseId) {
      return res.status(400).json({
        success: false,
        message: 'Case ID is required'
      });
    }

    // Get case data from MongoDB
    const caseData = await Case.findById(caseId).select('-notifications').lean();
    
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check rate limiting (4-hour cooldown)
    const currentTime = new Date();
    const lastSearchedTime = caseData.lastSearchedTime;
    
    if (lastSearchedTime) {
      const timeDiff = currentTime.getTime() - lastSearchedTime.getTime();
      const cooldownPeriod = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
      
      if (timeDiff < cooldownPeriod) {
        const remainingTime = cooldownPeriod - timeDiff;
        const hours = Math.floor(remainingTime / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        
        return res.status(429).json({
          success: false,
          message: `Rate limit exceeded. You can use AI search again in ${hours}h ${minutes}m (6 times per day allowed)`,
          lastSearchedTime: lastSearchedTime.toISOString()
        });
      }
    }

    // Update last searched time in MongoDB
    await Case.findByIdAndUpdate(caseId, {
      lastSearchedTime: currentTime
    });

    // Search for similar cases using Pinecone
    const searchResults = await searchSimilarCases(caseId, {
      gender: gender || caseData.gender,
      status: status || caseData.status,
      country: country || caseData.country,
      date: date || caseData.dateMissingFound
    });

    // Extract case IDs from Pinecone results
    const caseIds = searchResults.map(result => {
      // Extract case ID from vector ID (format: caseId_imageNumber)
      return result.id.split('_')[0];
    });

    // Fetch complete case data from MongoDB
    const similarCases = await Case.find({
      _id: { $in: caseIds }
    }).select('-notifications').lean();

    // Transform data to match frontend expectations and generate S3 URLs
    const transformedCases = await Promise.all(similarCases.map(async (caseData) => {
      // Generate S3 keys for both images using country-based prefix (no extension)
      const countryPath = (caseData.country || 'India').replace(/\s+/g, '_').toLowerCase();
      const imageUrls = [];
      
      try {
        for (let i = 1; i <= 2; i++) {
          const key = `${countryPath}/${caseData._id}_${i}`;
          try {
            const imageUrl = await getPresignedGetUrl(config.awsBucketName, key, 14400); // 4 hours expiry for AI search
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
        imageUrls: imageUrls
      };
    }));
    
    res.json({
      success: true,
      message: `Found ${transformedCases.length} similar cases.`,
      data: transformedCases,
      lastSearchedTime: currentTime.toISOString()
    });

  } catch (error) {
    console.error('Error in find-matches:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
