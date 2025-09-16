import Case from "../model/caseModel.js";
import User from "../model/userModel.js";
import HomepageSection from "../model/homepageModel.js";
import { generateEmbeddings } from "../services/lambdaService.js";
import { storeEmbeddings } from "../services/pineconeService.js";
import { uploadToS3 } from "../services/s3Service.js";
import { moderateImage } from "../services/contentSafetyService.js";

// Helper function to increment impact counter
const incrementImpactCounter = async () => {
    try {
        // Find the impact section
        const impactSection = await HomepageSection.findOne({ section: 'impact' });
        
        if (!impactSection) {
            console.error('Impact section not found in database');
            return;
        }

        // Find the "Cases Registered" stat
        const casesRegisteredStat = impactSection.data.stats.find(stat => 
            stat.label.includes('Cases Registered')
        );

        if (!casesRegisteredStat) {
            console.error('Cases Registered stat not found in impact section');
            return;
        }

        // Parse current value (e.g., "1,000+" → 1000)
        const currentValue = casesRegisteredStat.value;
        const numericValue = parseInt(currentValue.replace(/[^\d]/g, '')) || 0;
        
        // Increment by 1
        const newValue = numericValue + 1;
        
        // Format back (e.g., 1001 → "1,001+")
        const formattedValue = newValue.toLocaleString() + '+';
        
        // Update the value
        casesRegisteredStat.value = formattedValue;
        
        // Mark the nested data object as modified
        impactSection.markModified('data');
        
        // Save the updated section
        await impactSection.save();
        
    } catch (error) {
        console.error('Error updating impact counter:', error);
        // Don't throw error to avoid breaking case registration
    }
};

export const registerCase = async (req, res) => {
    try {
        // Validate required fields based on frontend schema
        const requiredFields = [
            'fullName', 'age', 'gender', 'contactNumber', 'height', 'complexion',
            'status', 'dateMissingFound', 'address', 'country', 'pincode',
            'FIRNumber', 'policeStationName', 'policeStationCountry', 'policeStationPincode'
        ];
        const missingFields = requiredFields.filter(field => !req.body[field] || req.body[field].trim() === '');
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                status: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Validate images
        if (!req.files || !req.files.length || req.files.length !== 2) {
            return res.status(400).json({
                status: false,
                message: 'Exactly 2 images are required'
            });
        }

        // Check FIR number uniqueness within the same country if provided
        if (req.body.FIRNumber) {
            const existingCase = await Case.findOne({ 
                FIRNumber: req.body.FIRNumber,
                policeStationCountry: req.body.policeStationCountry 
            });
            if (existingCase) {
                return res.status(409).json({
                    status: false,
                    message: 'Case reference number already exists in this country. Please provide a unique case reference number.'
                });
            }
        }

        // Moderate images for inappropriate content
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const moderationResult = await moderateImage(file.buffer);
            
            if (!moderationResult.isAppropriate) {
                return res.status(400).json({
                    status: false,
                    message: `Inappropriate content detected in image ${i + 1}. Please upload appropriate images.`
                });
            }
        }

        // Check if verification should be bypassed (police only)
        const bypassVerification = req.body.bypassVerification === 'true' && req.body.reportedBy === 'police';

        // Create new case in MongoDB with default values for missing fields
        const newCase = new Case({
            fullName: req.body.fullName,
            age: req.body.age,
            gender: req.body.gender,
            contactNumber: req.body.contactNumber,
            height: req.body.height,
            complexion: req.body.complexion,
            identificationMark: req.body.identificationMark || "",
            dateMissingFound: req.body.dateMissingFound,
            city: req.body.city || "",
            state: req.body.state || "",
            pincode: req.body.pincode,
            country: req.body.country,
            description: req.body.description || "",
            addedBy: req.body.reportedBy || 'general_user',
            caseOwner: req.auth?.userId || null,
            landMark: req.body.landMark || "",
            FIRNumber: req.body.FIRNumber,
            policeStationState: req.body.policeStationState || "",
            policeStationCity: req.body.policeStationCity || "",
            policeStationName: req.body.policeStationName,
            policeStationCountry: req.body.policeStationCountry,
            policeStationPincode: req.body.policeStationPincode,
            status: req.body.status,
            reportedBy: req.body.reportedBy,
            caseRegisterDate: new Date(),
            isAssigned: false,
            lastSearchedTime: new Date(req.body.dateMissingFound),
            verificationBypassed: bypassVerification
        });

        // Add reward only if provided in the request
        if (req.body.reward && req.body.reward.trim() !== "") {
            newCase.reward = req.body.reward;
        }

        // Save the case
        const savedCase = await newCase.save();

        // Increment impact counter for cases registered
        await incrementImpactCounter();

        // Add case creation notification
        const caseCreationNotification = {
            message: `Case registered`,
            time: new Date(),
            ipAddress: (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || req.connection.remoteAddress || 'Unknown',
            phoneNumber: req.body.contactNumber || 'Not provided',
            isRead: false
        };
        
        // Add notification to the case
        await Case.findByIdAndUpdate(savedCase._id, {
            $push: { notifications: caseCreationNotification }
        });

        // Generate embeddings for the images (now that we have the case ID)
        let embeddings;
        try {
            embeddings = await generateEmbeddings(req.files[0], req.files[1], !bypassVerification, savedCase._id, req.body.country);
        } catch (embeddingError) {
            // Rollback: Delete the saved case since embedding generation failed
            await Case.findByIdAndDelete(savedCase._id);
            
            // Check for specific technical error messages and convert to user-friendly ones
            const errorMessage = embeddingError.message;
            if (errorMessage.includes('MTCNN') && errorMessage.includes('Retinaface')) {
                throw new Error('Unable to detect face in both images. Please upload clear photos showing the person\'s face.');
            } else if (errorMessage.includes('face verification failed')) {
                throw new Error('Face detection failed. Please upload clear photos showing the person\'s face.');
            } else if (errorMessage.includes('MTCNN') || errorMessage.includes('Retinaface')) {
                throw new Error('Unable to detect face in the images. Please upload clear photos showing the person\'s face.');
            } else {
                // Use the Lambda error message directly for other cases
                throw new Error(errorMessage);
            }
        }

        // Add case ID to user's cases array
        const clerkUserId = req.auth?.userId;
        if (clerkUserId) {
            await User.findOneAndUpdate(
                { clerkUserId: clerkUserId },
                { $addToSet: { cases: savedCase._id } },
                { upsert: true }
            );
        }

        // Prepare metadata for Pinecone
        const metadata = {
            caseId: savedCase._id.toString(),
            gender: savedCase.gender,
            country: savedCase.country,
            status: savedCase.status,
            dateMissingFoundTs: new Date(savedCase.dateMissingFound).getTime()
        };

        // Upload images to S3
        try {
            const uploadPromises = req.files.map((file, index) => 
                uploadToS3(file, savedCase._id, index + 1, req.body.country)
            );
            await Promise.all(uploadPromises);
        } catch (uploadError) {
            // Rollback: Delete the saved case since S3 upload failed
            await Case.findByIdAndDelete(savedCase._id);
            throw uploadError;
        }

        // Store embeddings in Pinecone
        try {
            await storeEmbeddings(embeddings, metadata);
        } catch (pineconeError) {
            // Rollback: Delete the saved case since Pinecone storage failed
            await Case.findByIdAndDelete(savedCase._id);
            throw pineconeError;
        }

        return res.status(201).json({
            status: true,
            message: 'Case registered successfully',
            caseId: savedCase._id
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: error.message || 'Failed to register case. Please check your information and try again.'
        });
    }
};