import Case from "../model/caseModel.js";
import User from "../model/userModel.js";
import HomepageSection from "../model/homepageModel.js";
import redis from "../services/redisClient.js";
import PoliceStation from "../model/policeStationModel.js";
import { clerkClient } from '@clerk/express';
import { generateEmbeddings } from "../services/lambdaService.js";
import { storeEmbeddings } from "../services/pineconeService.js";
import { uploadToS3 } from "../services/s3Service.js";
import { generateEnglishCaseSummary } from "../services/googleAiService.js";
import { moderateImage } from "../services/contentSafetyService.js";

// Increment Cases Registered using model helper (numeric-safe)
const incrementImpactCounter = async () => {
    try {
        await HomepageSection.incrementCasesRegistered(1);
    } catch (error) {
        console.error('Error updating impact counter:', error);
    }
};

export const registerCase = async (req, res) => {
    try {
        const normalize = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v)
        const within = (v, max) => (typeof v === 'string' ? v.length <= max : true)
        const matches = (v, re) => (typeof v === 'string' ? re.test(v) : true)
        // Validate required fields based on frontend schema
        const baseRequired = [
            'fullName', 'age', 'gender', 'contactNumber', 'height', 'complexion',
            'status', 'dateMissingFound', 'address', 'country', 'postalCode'
        ];
        const policeRequired = ['FIRNumber', 'policeStationName', 'policeStationCountry', 'policeStationPostalCode'];
        const requiredFields = req.body.status === 'missing' ? [...baseRequired, ...policeRequired] : baseRequired;
        const missingFields = requiredFields.filter(field => !req.body[field] || String(req.body[field]).trim() === '');
        
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

        // Normalize and enforce invisible limits
        req.body.fullName = normalize(req.body.fullName)
        req.body.contactNumber = normalize(req.body.contactNumber)
        req.body.identificationMark = normalize(req.body.identificationMark)
        req.body.description = normalize(req.body.description)
        req.body.address = normalize(req.body.address)
        req.body.country = normalize(req.body.country)
        req.body.state = normalize(req.body.state)
        req.body.city = normalize(req.body.city)
        req.body.postalCode = normalize(req.body.postalCode)
        // Normalize FIRNumber to uppercase for consistency and to prevent case-sensitive duplicates
        req.body.FIRNumber = req.body.FIRNumber ? normalize(req.body.FIRNumber).toUpperCase() : undefined
        req.body.policeStationName = normalize(req.body.policeStationName)
        req.body.policeStationCountry = normalize(req.body.policeStationCountry)
        req.body.policeStationState = normalize(req.body.policeStationState)
        req.body.policeStationCity = normalize(req.body.policeStationCity)
        req.body.policeStationPostalCode = normalize(req.body.policeStationPostalCode)

        // If status is 'found' and police info left blank, omit police fields to avoid empty-string duplicates
        const isMissingStatus = String(req.body.status || '').toLowerCase() === 'missing'
        if (!isMissingStatus) {
            if (!req.body.FIRNumber) req.body.FIRNumber = undefined
            if (!req.body.policeStationName) req.body.policeStationName = undefined
            if (!req.body.policeStationCountry) req.body.policeStationCountry = undefined
            if (!req.body.policeStationState) req.body.policeStationState = undefined
            if (!req.body.policeStationCity) req.body.policeStationCity = undefined
            if (!req.body.policeStationPostalCode) req.body.policeStationPostalCode = undefined
        }

        const fail = (field) => res.status(400).json({ status: false, message: `Please shorten the ${field}.` })

        if (!within(req.body.fullName, 120)) return fail('full name')
        if (!within(req.body.contactNumber, 20)) return fail('contact number')
        if (!within(req.body.identificationMark || '', 100)) return fail('identification mark')
        if (!within(req.body.description || '', 250)) return fail('description')
        if (!within(req.body.address, 300)) return fail('address')
        if (!within(req.body.country, 64)) return fail('country')
        if (!within(req.body.state || '', 64)) return fail('state')
        if (!within(req.body.city || '', 64)) return fail('city')
        if (req.body.status === 'missing') {
            if (!within(req.body.policeStationName, 120)) return fail('police station name')
            if (!within(req.body.policeStationCountry, 64)) return fail('police station country')
            if (!within(req.body.policeStationState || '', 64)) return fail('police station state')
            if (!within(req.body.policeStationCity || '', 64)) return fail('police station city')
        }
        if (!within(req.body.postalCode, 12) || !matches(req.body.postalCode, /^[A-Za-z0-9 \-]+$/)) return fail('postal code')
        if (req.body.status === 'missing') {
            if (!within(req.body.policeStationPostalCode, 12) || !matches(req.body.policeStationPostalCode, /^[A-Za-z0-9 \-]+$/)) return fail('police station postal code')
            if (!within(req.body.FIRNumber, 50) || !matches(req.body.FIRNumber, /^[A-Za-z0-9 \-]+$/)) return fail('case reference number')
        }

        // Check FIR number uniqueness within the same country if provided
        // Note: FIRNumber is already normalized to uppercase above
        if (req.body.FIRNumber && req.body.policeStationCountry) {
            const existingCase = await Case.findOne({ 
                FIRNumber: req.body.FIRNumber, // Already uppercase from normalization above
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

        // Validate bypassVerification: if true, verify user is police or volunteer
        // FormData sends all values as strings, so bypassVerification will be 'true' or 'false' (string)
        const requestedBypass = req.body.bypassVerification === 'true';
        let bypassVerification = false;
        
        if (requestedBypass) {
            // Get user's role from Clerk (source of truth)
            const clerkUserId = req.auth()?.userId;
            if (!clerkUserId) {
                return res.status(401).json({
                    status: false,
                    message: 'Unauthorized. Please sign in to register a case.'
                });
            }

            try {
                const clerkUser = await clerkClient.users.getUser(clerkUserId);
                const userRole = clerkUser.publicMetadata?.role || 'general_user';
                
                // Only police and volunteer can bypass verification
                if (userRole !== 'police' && userRole !== 'volunteer') {
                    return res.status(403).json({
                        status: false,
                        message: 'Access denied. Only police and volunteer users can bypass AI verification.'
                    });
                }

                // User is authorized, allow bypass
                bypassVerification = true;
            } catch (error) {
                console.error('Error verifying user role for bypass verification:', error);
                return res.status(500).json({
                    status: false,
                    message: 'Failed to verify user authorization. Please try again.'
                });
            }
        }

        // Create new case in MongoDB with default values for missing fields
        // Set aiDescription to user's original description initially
        // If AI generation succeeds, it will be updated; if it fails, user's description remains visible
        const userDescription = req.body.description || "";
        
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
            postalCode: req.body.postalCode,
            country: req.body.country,
            description: userDescription,
            aiDescription: userDescription, // Set to user's description initially (will be updated if AI succeeds)
            addedBy: req.body.reportedBy || 'general_user',
            caseOwner: req.auth()?.userId || null,
            landMark: req.body.landMark || "",
            FIRNumber: req.body.FIRNumber || undefined,
            policeStationState: req.body.policeStationState || "",
            policeStationCity: req.body.policeStationCity || "",
            policeStationName: req.body.policeStationName || undefined,
            policeStationCountry: req.body.policeStationCountry || undefined,
            policeStationPostalCode: req.body.policeStationPostalCode || undefined,
            status: req.body.status,
            reportedBy: req.body.reportedBy || 'general_user',
            caseRegisterDate: new Date(),
            isAssigned: false,
            lastSearchedTime: new Date(req.body.dateMissingFound),
            verificationBypassed: bypassVerification
        });

        // Add reward only if provided in the request
        if (req.body.reward && req.body.reward.trim() !== "") {
            newCase.reward = req.body.reward;
        }

        // Save the case with graceful duplicate handling for FIR uniqueness
        let savedCase;
        try {
            savedCase = await newCase.save();
        } catch (e) {
            if (e && e.code === 11000) {
                return res.status(409).json({
                    status: false,
                    message: 'Case reference number already exists for the selected country. Please provide a unique FIR number or leave it blank.'
                });
            }
            throw e;
        }


        // Add case creation timeline entry with user role
        const userRole = req.body.reportedBy || 'general_user';
        const roleDisplayName = userRole === 'police' ? 'Police Station' : 
                               userRole === 'NGO' ? 'NGO' : 
                               userRole === 'volunteer' ? 'Volunteer' : 'You';
        
        const caseCreationTimeline = {
            message: `Case registered as ${req.body.status || 'missing'} by ${roleDisplayName}`,
            time: new Date(),
            ipAddress: (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || req.connection.remoteAddress || 'Unknown',
            phoneNumber: req.body.contactNumber || 'Not provided'
        };
        
        // Add timeline entry to the case
        await Case.findByIdAndUpdate(savedCase._id, {
            $push: { timelines: caseCreationTimeline }
        });

        // Add notification to the user's notification array
        const auth = req.auth();
        if (auth?.userId) {
            const notificationData = {
                message: `Case for ${req.body.fullName} has been successfully registered and is now live on the platform`,
                time: new Date(),
                isRead: false,
                isClickable: true,
                navigateTo: `/cases/${String(savedCase._id)}`
            };

            const updatedUser = await User.findOneAndUpdate(
                { clerkUserId: auth.userId },
                { $push: { notifications: notificationData } },
                { new: true }
            ).select('notifications email').lean();

            // Broadcast notification via SSE
            if (updatedUser && updatedUser.notifications && updatedUser.notifications.length > 0) {
                const newNotification = updatedUser.notifications[updatedUser.notifications.length - 1];
                const unreadCount = (updatedUser.notifications || []).filter(n => !n.isRead).length;
                try {
                    const { broadcastNotification } = await import('../services/notificationBroadcast.js');
                    broadcastNotification(auth.userId, {
                        id: String(newNotification._id),
                        message: newNotification.message || '',
                        isRead: Boolean(newNotification.isRead),
                        isClickable: newNotification.isClickable !== false,
                        navigateTo: newNotification.navigateTo || null,
                        time: newNotification.time || null,
                        unreadCount,
                    });
                } catch (error) {
                    console.error('Error broadcasting notification:', error);
                    // Don't fail the request if broadcast fails
                }
            }

            // Send email notification (non-blocking)
            if (updatedUser && updatedUser.email) {
                try {
                    const { sendEmailNotificationAsync } = await import('../services/emailService.js');
                    await sendEmailNotificationAsync(
                        updatedUser.email,
                        'Case Registered Successfully',
                        `Case for ${req.body.fullName} has been successfully registered and is now live on the platform.`,
                        {
                            notificationType: 'case_registered',
                            userId: auth.userId,
                            caseId: String(savedCase._id),
                            navigateTo: `/cases/${String(savedCase._id)}`,
                            fullName: req.body.fullName,
                            age: req.body.age,
                            gender: req.body.gender,
                            lastSeenLocation: req.body.lastSeenLocation,
                        }
                    );
                } catch (error) {
                    console.error('Error sending email notification (non-blocking):', error);
                    // Don't fail the request if email fails
                }
            }
        }

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
        const clerkUserId = req.auth()?.userId;
        if (clerkUserId) {
            await User.findOneAndUpdate(
                { clerkUserId: clerkUserId },
                { $addToSet: { cases: savedCase._id } },
                { upsert: true }
            );
        }

        // Tag case to police station if policeStationId is provided
        if (req.body.policeStationId) {
            try {
                const policeStation = await PoliceStation.findById(req.body.policeStationId).lean();
                if (policeStation && policeStation.registeredBy) {
                    const policeUserClerkId = policeStation.registeredBy;
                    
                    // Append case ID to police user's cases array
                    await User.findOneAndUpdate(
                        { clerkUserId: policeUserClerkId },
                        { $addToSet: { cases: savedCase._id } }
                    );

                    // Add notification to police user about new case in their jurisdiction
                    const caseStatus = req.body.status === 'missing' ? 'missing person' : 'found person';
                    const policeNotificationData = {
                        message: `New ${caseStatus} case registered for ${req.body.fullName} in your jurisdiction`,
                        time: new Date(),
                        isRead: false,
                        isClickable: true,
                        navigateTo: `/cases/${String(savedCase._id)}`
                    };

                    const updatedPoliceUser = await User.findOneAndUpdate(
                        { clerkUserId: policeUserClerkId },
                        { $push: { notifications: policeNotificationData } },
                        { new: true }
                    ).select('notifications').lean();

                    // Broadcast notification via SSE
                    if (updatedPoliceUser && updatedPoliceUser.notifications && updatedPoliceUser.notifications.length > 0) {
                        const newNotification = updatedPoliceUser.notifications[updatedPoliceUser.notifications.length - 1];
                        const unreadCount = (updatedPoliceUser.notifications || []).filter(n => !n.isRead).length;
                        try {
                            const { broadcastNotification } = await import('../services/notificationBroadcast.js');
                            broadcastNotification(policeUserClerkId, {
                                id: String(newNotification._id),
                                message: newNotification.message || '',
                                isRead: Boolean(newNotification.isRead),
                                isClickable: newNotification.isClickable !== false,
                                navigateTo: newNotification.navigateTo || null,
                                time: newNotification.time || null,
                                unreadCount,
                            });
                        } catch (error) {
                            console.error('Error broadcasting police notification:', error);
                            // Don't fail the request if broadcast fails
                        }
                    }
                }
            } catch (error) {
                // Log error but don't fail case registration if police tagging fails
                console.error('Error tagging case to police station:', error.message || error);
            }
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

        // All downstream steps succeeded → increment homepage counter and invalidate cache
        try {
            await incrementImpactCounter();
            try { await redis.set('homepage:cache:enabled', 'false') } catch {}
        } catch (e) {
            console.error('Increment Cases Registered failed (non-blocking):', e?.message || e)
        }

        // Fire-and-forget: generate concise English summary and save to description with retries
        // Use the savedCase snapshot + originalDescription to avoid an extra DB read
        ;(async () => {
            const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
            const attempts = [0, 5000, 15000];
            const baseCaseData = {
                fullName: savedCase.fullName,
                age: savedCase.age,
                gender: savedCase.gender,
                status: savedCase.status,
                dateMissingFound: savedCase.dateMissingFound,
                city: savedCase.city,
                state: savedCase.state,
                country: savedCase.country,
                identificationMark: savedCase.identificationMark,
                reward: savedCase.reward,
                reportedBy: savedCase.reportedBy,
                description: savedCase.description,
            };
            for (let i = 0; i < attempts.length; i++) {
                try {
                    if (attempts[i] > 0) await sleep(attempts[i]);
                    const summary = await generateEnglishCaseSummary(baseCaseData);
                    if (summary && typeof summary === 'string' && summary.trim().length > 0) {
                        await Case.findByIdAndUpdate(savedCase._id, { aiDescription: summary.trim() });
                        return; // success; stop retries
                    }
                } catch (e) {
                    // On final failure, log and leave placeholder in place
                    if (i === attempts.length - 1) {
                        try { console.error('[registerCase] AI summary generation failed after retries:', e?.message || e); } catch {}
                    }
                }
            }
        })();

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