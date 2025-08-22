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

// Upload file to S3 using a presigned URL (no extension in key)
const uploadToS3 = async (file, caseId, imageIndex, country, bucket = config.awsBucketName) => {
    try {
        // Clean country name for S3 path
        const countryPath = country.replace(/\s+/g, '_').toLowerCase();
        // No extension in the key - just the case ID and image index
        const key = `${countryPath}/${caseId}_${imageIndex}`;

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: file.mimetype // Preserve original MIME type
        });

        // Generate a presigned URL for uploading
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 30 }); // 30 seconds expiry

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
const getPresignedGetUrl = async (bucket, key, expiresIn) => {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    // Default to 10 seconds if expiresIn is not provided
    const expiry = (typeof expiresIn === 'number' && expiresIn > 0) ? expiresIn : 10;
    return await getSignedUrl(s3Client, command, { expiresIn: expiry });
};

export { uploadToS3, getPresignedGetUrl }; 