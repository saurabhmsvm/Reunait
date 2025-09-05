import Case from "../model/caseModel.js";
import User from "../model/userModel.js";
import { generateEmbeddings } from "../services/lambdaService.js";
import { storeEmbeddings } from "../services/pineconeService.js";
import { uploadToS3 } from "../services/s3Service.js";
import { moderateImage } from "../services/contentSafetyService.js";
import { config } from '../config/config.js';

export const registerCase = async (req, res) => {
    try {
        // Validate request data

        // Validate required fields
        if (!req.body.fullName || !req.body.contactNumber || !req.body.dateMissingFound || 
            !req.body.city || !req.body.state || !req.body.pincode || !req.body.country) {
            return res.status(400).json({
                message: 'Missing required fields',
                receivedFields: req.body
            });
        }

        // Validate images
        if (!req.files || !req.files.length || req.files.length !== 2) {
            return res.status(400).json({
                message: 'Exactly 2 images are required',
                receivedFiles: req.files ? req.files.length : 0
            });
        }

        // Check FIR number uniqueness if provided
        if (req.body.FIRNumber) {
            const existingCase = await Case.findOne({ FIRNumber: req.body.FIRNumber });
            if (existingCase) {
                return res.status(409).json({
                    message: 'FIR number already exists. Please provide a unique FIR number.',
                });
            }
        }

        // Moderate images for inappropriate content
        for (const file of req.files) {
            const moderationResult = await moderateImage(file.buffer);
            if (!moderationResult.isAppropriate) {
                return res.status(400).json({
                    message: 'Inappropriate content detected in images'
                });
            }
        }

        // Generate embeddings for the images
        const embeddings = await generateEmbeddings(req.files[0], req.files[1]);

        // Create new case in MongoDB
        const newCase = new Case({
            fullName: req.body.fullName,
            age: req.body.age,
            gender: req.body.gender,
            contactNumber: req.body.contactNumber,
            height: req.body.height,
            complexion: req.body.complexion,
            identificationMark: req.body.identificationMark,
            dateMissingFound: req.body.dateMissingFound,
            city: req.body.city,
            state: req.body.state,
            pincode: req.body.pincode,
            country: req.body.country,
            description: req.body.description,
            addedBy: req.body.addedBy,
            landMark: req.body.landMark,
            FIRNumber: req.body.FIRNumber,
            policeStationState: req.body.policeStationState,
            policeStationCity: req.body.policeStationCity,
            policeStationName: req.body.policeStationName,
            status: req.body.status || 'missing', // Default to 'missing' if not provided
            reportedBy: req.body.reportedBy,
            lastSearchedTime: new Date(req.body.dateMissingFound) // Set initial value to case date
        });

        // Add reward field only for missing cases
        if (req.body.status === "missing" && req.body.reward) {
            newCase.reward = req.body.reward;
        }

        // Save the case
        const savedCase = await newCase.save();

        // Add case ID to user's cases array
        if (req.body.addedBy) {
            await User.findByIdAndUpdate(
                req.body.addedBy,
                { $push: { cases: savedCase._id } },
                { new: true }
            );
        }

        // Create metadata before using it
        const metadata = {
            dateMissingFoundTs: new Date(req.body.dateMissingFound).getTime(), // Numeric timestamp for Pinecone filtering
            gender: req.body.gender,
            status: req.body.status || 'missing'
        };

        // Upload images to S3 (no extensions needed)
        await Promise.all(
            req.files.map((file, index) => uploadToS3(file, savedCase._id, index + 1, req.body.country, config.awsBucketName))
        );

        // Store embeddings in Pinecone
        await storeEmbeddings(savedCase._id, embeddings, metadata, req.body.country);

        return res.status(201).json({
            message: 'Case registered successfully',
            case: savedCase
        });

    } catch (error) {
        console.error('Register case error:', error);
        return res.status(500).json({
            message: 'Error registering case',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};