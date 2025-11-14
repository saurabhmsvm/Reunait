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
    awsLambdaFunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'face_embedding_microservice',
    
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
        fromName: process.env.RESEND_FROM_NAME || 'Reunait',
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
    
    // Razorpay Configuration
    // Official Documentation: https://razorpay.com/docs/payments/international-payments/#supported-currencies
    razorpay: {
        // Supported currencies (ISO 4217 codes)
        // Razorpay supports 130+ currencies. Configure via environment variable as comma-separated list
        // Example: SUPPORTED_CURRENCIES=INR,USD,EUR,GBP,JPY,BHD
        // Full list: https://razorpay.com/docs/payments/international-payments/#supported-currencies
        supportedCurrencies: process.env.SUPPORTED_CURRENCIES 
            ? process.env.SUPPORTED_CURRENCIES.split(',').map(c => c.trim().toUpperCase())
            : [], // No restriction by default; accepts any valid ISO code Razorpay supports
        
        // UI display (symbols/names) should be handled on the client using Intl APIs.
        
        // Currency exponents (decimal places)
        // Source: https://razorpay.com/docs/payments/international-payments/#supported-currencies
        // Exponent 0 = Zero-decimal currencies (1 unit = 1 subunit)
        // Exponent 2 = Two-decimal currencies (1 unit = 100 subunits, e.g., ₹1 = 100 paise)
        // Exponent 3 = Three-decimal currencies (1 unit = 1000 subunits, e.g., 1 BHD = 1000 fils)
        currencyExponents: {
            // Zero-decimal currencies (Exponent 0)
            'BIF': 0, 'CLP': 0, 'DJF': 0, 'GNF': 0, 'ISK': 0, 'JPY': 0, 'KMF': 0, 'KRW': 0,
            'PYG': 0, 'RWF': 0, 'UGX': 0, 'VND': 0, 'VUV': 0, 'XAF': 0, 'XOF': 0, 'XPF': 0,
            // Three-decimal currencies (Exponent 3)
            'BHD': 3, 'IQD': 3, 'JOD': 3, 'KWD': 3, 'OMR': 3, 'TND': 3,
            // Two-decimal currencies (Exponent 2) - All others default to 2
            // This includes: AED, ALL, AMD, AUD, AWG, AZN, BAM, BBD, BDT, BGN, BMD, BND, BOB,
            // BRL, BSD, BTN, BWP, BZD, CAD, CHF, CNY, COP, CRC, CUP, CVE, CZK, DKK, DOP, DZD,
            // EGP, ETB, EUR, FJD, GBP, GHS, GIP, GMD, GTQ, GYD, HKD, HNL, HRK, HTG, HUF, IDR,
            // ILS, INR, JMD, KES, KGS, KHR, KYD, KZT, LAK, LKR, LRD, LSL, MAD, MDL, MGA, MKD,
            // MMK, MNT, MOP, MUR, MVR, MWK, MXN, MYR, MZN, NAD, NGN, NIO, NOK, NPR, NZD, PEN,
            // PGK, PHP, PKR, PLN, QAR, RON, RSD, RUB, SAR, SCR, SEK, SGD, SLL, SOS, SVC, SZL,
            // THB, TRY, TTD, TWD, TZS, UAH, USD, UYU, UZS, YER, ZAR, ZMW, XCD
        },
    },
}; 