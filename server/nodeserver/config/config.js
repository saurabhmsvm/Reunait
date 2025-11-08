import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

export const config = {
    // Server Configuration
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // MongoDB Configuration
    mongoUri: process.env.MONGODB_URI,
    
    // AWS Configuration
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    awsBucketName: process.env.AWS_BUCKET_NAME,
    awsTempImageBucket: process.env.AWS_TEMP_IMAGE_BUCKET,
    
    // Azure Content Safety
    azureEndpoint: process.env.AZURE_ENDPOINT,
    azureKey: process.env.AZURE_KEY,
    azureApiVersion: process.env.AZURE_API_VERSION || '2024-09-01',
    
    // Flask Service
    flaskServiceUrl: process.env.FLASK_SERVICE_URL || 'http://localhost:5000',
    
    // Pinecone
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeIndex: process.env.PINECONE_INDEX,
    pineconeSearchThreshold: parseFloat(process.env.PINECONE_SEARCH_THRESHOLD) || 0.6, // 60% similarity threshold
    pineconeTopK: parseInt(process.env.PINECONE_TOP_K) || 3, // Number of results to return
    
    // ImageKit Configuration
    imageKitId: process.env.IMAGEKIT_ID,
    imageKitBaseUrl: process.env.IMAGEKIT_BASE_URL || 'https://ik.imagekit.io',
    
    // Rate Limiting
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000, // 15 minutes in milliseconds
    rateLimitMax: process.env.RATE_LIMIT_MAX || 100,
    
    // Redis Cloud Configuration
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD
    },
    
    // File Upload
    maxFileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, // 5MB in bytes
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/jpg'],
    
    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',

    // Google Gemini
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
    
    // Presigned URL Expiration (in seconds)
    presignedUrlExpiry: parseInt(process.env.PRESIGNED_URL_EXPIRY_SECONDS) || 180,
    
    // Resend Email Configuration
    resend: {
        apiKey: process.env.RESEND_API_KEY,
        fromAddress: process.env.RESEND_FROM_EMAIL || 'notifications@resend.dev',
        fromName: process.env.RESEND_FROM_NAME || 'FindMe',
    },
    // Resend Template IDs (dashboard-managed templates)
    // Template variants: green (success), blue (info), red (alert), welcome (special)
    resendTemplates: {
        green: process.env.RESEND_TEMPLATE_GREEN,
        blue: process.env.RESEND_TEMPLATE_BLUE,
        red: process.env.RESEND_TEMPLATE_RED,
        welcome: process.env.RESEND_TEMPLATE_WELCOME,
    },
    
    // Frontend URL for email links (without /api suffix)
    frontendUrl: process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'https://yourdomain.com',
}; 