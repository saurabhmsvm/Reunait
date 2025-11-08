import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { config } from '../config/config.js';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import axios from "axios";
// import sharp from "sharp"; // Uncomment when sharp is installed

// Initialize S3 client
const s3Client = new S3Client({
    region: config.awsRegion,
    credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey
    }
});

/**
 * Presigned URL expiration times (in seconds)
 * Following AWS best practices: shortest practical expiration time
 * 
 * Expiry time is configured via environment variable PRESIGNED_URL_EXPIRY_SECONDS
 * Default: 180 seconds (3 minutes) - good balance between security and UX
 * 
 * Upload operations: 30 seconds (sufficient for file upload)
 */
export const PRESIGNED_URL_EXPIRY = {
    IMAGE_VIEWING: config.presignedUrlExpiry,  // From environment variable (default: 180 seconds)
    IMAGE_UPLOAD: 30,                           // 30 seconds - for file uploads
    AI_SEARCH: config.presignedUrlExpiry,       // Same as IMAGE_VIEWING
};

// Upload file to S3 using a presigned URL (standardized to JPEG format)
const uploadToS3 = async (file, caseId, imageIndex, country, bucket = config.awsBucketName) => {
    try {
        // Clean country name for S3 path
        const countryPath = country ? country.replace(/\s+/g, '_').toLowerCase() : 'default';
        
        // Standardize to JPEG format for consistency
        const key = `${countryPath}/${caseId}_${imageIndex}.jpg`;

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: 'image/jpeg' // Standardized to JPEG format
        });

        // Generate a presigned URL for uploading
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_EXPIRY.IMAGE_UPLOAD });

        // Upload the file using the presigned URL
        const uploadResponse = await axios.put(presignedUrl, file.buffer, {
            headers: {
                'Content-Type': file.mimetype
            }
        });

        // File uploaded successfully

    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw error;
    }
};

// Generate a presigned GET URL for a given bucket/key
// If expiresIn is not provided, uses standard IMAGE_VIEWING expiry
const getPresignedGetUrl = async (bucket, key, expiresIn = PRESIGNED_URL_EXPIRY.IMAGE_VIEWING) => {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    // Ensure expiry is valid (must be positive number)
    const expiry = (typeof expiresIn === 'number' && expiresIn > 0) ? expiresIn : PRESIGNED_URL_EXPIRY.IMAGE_VIEWING;
    return await getSignedUrl(s3Client, command, { expiresIn: expiry });
};

export { uploadToS3, getPresignedGetUrl }; 