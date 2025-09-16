// Homepage data controller
// This endpoint is public and doesn't require authentication

import HomepageSection from '../model/homepageModel.js';

export const getHomepageData = async (req, res) => {
    try {
        // Fetch homepage data from MongoDB
        const homepageData = await HomepageSection.getHomepageData();

        // Set cache headers for better performance
        res.set({
            'Cache-Control': 'public, max-age=300, s-maxage=600', // Cache for 5 minutes
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
        });

        res.status(200).json(homepageData);

    } catch (error) {
        console.error('Error fetching homepage data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch homepage data',
            data: []
        });
    }
};

