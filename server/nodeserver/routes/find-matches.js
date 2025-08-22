import express from 'express';
import Case from '../model/caseModel.js';
import { searchSimilarCases } from '../services/pineconeService.js';

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
    
    // Return results
    res.json({
      success: true,
      message: `Found ${searchResults.length} similar cases.`,
      results: searchResults,
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
