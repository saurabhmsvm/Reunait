import axios from 'axios';
import { config } from '../config/config.js';

const moderateImage = async (imageBuffer) => {
    try {
        // Convert buffer to base64
        let base64Image;
        try {
            base64Image = imageBuffer?.toString('base64');
        } catch (convErr) {
            console.error('Error converting image buffer to base64:', convErr);
            return { isAppropriate: false };
        }
        if (!base64Image || base64Image === 'undefined' || base64Image.length === 0) {
            console.error('Base64 image is undefined or empty.');
            return { isAppropriate: false };
        }

        const response = await axios({
            method: 'post',
            url: `${config.azureEndpoint}/contentsafety/image:analyze?api-version=${config.azureApiVersion}`,
            headers: {
                'Ocp-Apim-Subscription-Key': config.azureKey,
                'Content-Type': 'application/json'
            },
            data: {
                image: {
                    content: base64Image
                }
            }
        });

        // Define thresholds for each category
        const thresholds = {
            hate: 4,
            selfHarm: 4,
            sexual: 4,
            violence: 4
        };

        // Check if any category exceeds the threshold
        const categoriesAnalysis = response.data.categoriesAnalysis;
        let isAppropriate = true;
        const categoryScores = {};

        for (const category of categoriesAnalysis) {
            const categoryName = category.category.toLowerCase();
            const severity = category.severity;
            categoryScores[categoryName] = severity;

            if (thresholds[categoryName] && severity >= thresholds[categoryName]) {
                isAppropriate = false;
            }
        }

        // Check for blocklist matches
        if (response.data.blocklistsMatch && response.data.blocklistsMatch.length > 0) {
            isAppropriate = false;
        }

        return {
            isAppropriate
        };
    } catch (error) {
        console.error('Error moderating image:', error);
        throw error;
    }
};

export { moderateImage }; 