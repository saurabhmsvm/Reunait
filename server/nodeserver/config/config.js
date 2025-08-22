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
    
    // JWT Configuration
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    
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
}; 