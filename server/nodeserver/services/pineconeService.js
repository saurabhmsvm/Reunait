import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config/config.js';

// Initialize Pinecone
const pinecone = new Pinecone({
    apiKey: config.pineconeApiKey
});

// Get or create index
const indexName = config.pineconeIndex;

// Check if index exists, if not create it
const createIndexIfNotExists = async () => {
    try {
        const response = await pinecone.listIndexes();
        const indexes = response.indexes;

        if (!Array.isArray(indexes)) {
            throw new TypeError('Expected Pinecone indexes to be an array');
        }

        // Check if the index already exists
        const existingIndex = indexes.find(index => index.name === indexName);

        if (!existingIndex) {
            await pinecone.createIndex({
                name: indexName,
                dimension: 512,
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1',
                    },
                },
            });
        }
    } catch (error) {
        console.error('Error checking/creating Pinecone index:', error.message);
        throw error;
    }
};

// Initialize index
let index;
const initializeIndex = async () => {
    try {
        if (!index) {
            index = pinecone.index(indexName);
        }
        return index;
    } catch (error) {
        console.error('Error initializing index:', error);
        throw error;
    }
};

// Call initialization
initializeIndex().catch(console.error);

// Store embeddings in Pinecone
const storeEmbeddings = async (caseId, embeddings, metadata, country) => {
    try {
        const indexInstance = await initializeIndex();
        
        const vectors = [
            {
                id: `${caseId}_1`,
                values: embeddings[0],
                metadata: metadata
            },
            {
                id: `${caseId}_2`,
                values: embeddings[1],
                metadata: metadata
            }
        ];

        // Use country as namespace, convert to lowercase and replace spaces with underscores
        const namespace = country.toLowerCase().replace(/\s+/g, '_');

        await indexInstance.namespace(namespace).upsert(vectors);
        return true;
    } catch (error) {
        console.error('Error storing embeddings in Pinecone:', error);
        throw error;
    }
};

// Helper function to calculate date 2 months back
// This date will be used as the minimum date for searching
// Examples:
// Jan 31, 2021 -> Nov 30, 2020 (handles month length differences)
// Mar 15, 2021 -> Jan 15, 2021 (normal case)
// Feb 28, 2021 -> Dec 28, 2020 (leap year handling)
const calculateTwoMonthsBack = (dateString) => {
    const date = new Date(dateString);
    const twoMonthsBack = new Date(date);
    
    // Handle edge cases for months with fewer days
    const currentDay = date.getDate();
    twoMonthsBack.setMonth(date.getMonth() - 2);
    
    // If the day doesn't exist in the target month (e.g., Jan 31 -> Nov 30)
    if (twoMonthsBack.getDate() !== currentDay) {
        twoMonthsBack.setDate(0); // Set to last day of previous month
    }
    
    return twoMonthsBack;
};

// Search for similar cases - returns exactly top 3 most similar unique cases
const searchSimilarCases = async (caseId, searchParams) => {
    try {
        const { gender, status, country, date } = searchParams;
        
        // Determine target status (if searching for missing, look for found cases)
        const targetStatus = status === 'missing' ? 'found' : 'missing';
        
        // Calculate date range (2 months back from the given date)
        const twoMonthsBack = new Date(date);
        twoMonthsBack.setMonth(twoMonthsBack.getMonth() - 2);
        const twoMonthsBackTs = twoMonthsBack.getTime();
        
        // Use the appropriate namespace based on country
        const namespace = country?.toLowerCase() === 'india' ? 'india' : 'global';
        
        const indexInstance = await initializeIndex();
        
        // Fetch the case vectors first
        const fetchResponse = await indexInstance.namespace(namespace).fetch([`${caseId}_1`, `${caseId}_2`]);
        
        // Handle both old and new SDK response structures
        const vectors = fetchResponse.vectors || fetchResponse.records || {};
        
        if (!vectors[`${caseId}_1`] || !vectors[`${caseId}_2`]) {
            return [];
        }
        
        const caseVector1 = vectors[`${caseId}_1`].values;
        const caseVector2 = vectors[`${caseId}_2`].values;
        
        // Create filter for search
        const filter = {
            gender: gender,
            status: targetStatus,
            dateMissingFoundTs: {
                $gte: twoMonthsBackTs
            }
        };
        
        // Search for similar cases using both embeddings
        const searchResponse1 = await indexInstance.namespace(namespace).query({
            vector: caseVector1,
            topK: 10,
            filter: filter,
            includeMetadata: true
        });
        
        const searchResponse2 = await indexInstance.namespace(namespace).query({
            vector: caseVector2,
            topK: 10,
            filter: filter,
            includeMetadata: true
        });
        
        // Combine and deduplicate results
        const allMatches = [...searchResponse1.matches, ...searchResponse2.matches];
        const uniqueMatches = new Map();
        
        allMatches.forEach(match => {
            const caseId = match.id.split('_')[0]; // Extract case ID from vector ID
            if (!uniqueMatches.has(caseId)) {
                uniqueMatches.set(caseId, match);
            } else {
                // Keep the match with higher score
                const existingMatch = uniqueMatches.get(caseId);
                if (match.score > existingMatch.score) {
                    uniqueMatches.set(caseId, match);
                }
            }
        });
        
        // Convert back to array and sort by score
        const sortedResults = Array.from(uniqueMatches.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 3); // Return exactly top 3 unique cases
        
        return sortedResults;
    } catch (error) {
        console.error('Error in searchSimilarCases:', error);
        throw error;
    }
};

export { storeEmbeddings, searchSimilarCases }; 