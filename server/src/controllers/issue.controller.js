import Issue from "../models/issue.model.js";
import { validateIssueWithAI, getLocationDetails } from "../services/ai.service.js";
import { uploadToGCS, uploadBase64ToGCS, isGCSConfigured } from "../services/storage.service.js";
import { validateWithAIBackend, mapAIResponse } from "../services/ai-backend.service.js";

 
export const submitIssue = async (req, res) => {
    try {
        let { title, description, category, location } = req.body;
        const userId = req.user.userId; 
        let imageUrl = req.body.imageUrl;

      
        if (typeof location === 'string') {
            try {
                location = JSON.parse(location);
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid location format"
                });
            }
        }

         if (req.file) {
            if (isGCSConfigured()) {
                try {
                    imageUrl = await uploadToGCS(
                        req.file.buffer,
                        req.file.originalname,
                        'issues',
                        req.file.mimetype
                    );
                } catch (gcsError) {
                     console.log('GCS upload failed, falling back to base64:', gcsError.message);
                    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
                    imageUrl = base64Image;
                }
            } else {
                 const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
                imageUrl = base64Image;
                console.log('GCS not configured - using base64 storage');
            }
        }
         else if (imageUrl && imageUrl.startsWith('data:image')) {
            if (isGCSConfigured()) {
                try {
                    imageUrl = await uploadBase64ToGCS(imageUrl, 'issues');
                } catch (gcsError) {
                    console.log('GCS upload failed, keeping base64:', gcsError.message);
                     
                }
            }
     
        }

        if (!title || !description || !category || !imageUrl || !location) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const { lat, lng } = location;

        // Get location details
        const locationDetails = await getLocationDetails(lat, lng);

        // Create issue with "pending" status
        const issue = await Issue.create({
            userId,
            title,
            description,
            category,
            imageUrl,
            location: {
                type: 'Point',
                coordinates: [lng, lat],
                lat,
                lng,
                ...locationDetails
            },
            status: "pending" // Start with pending status
        });

        // Send to Spring Boot AI backend for validation (async)
        // Store image buffer and metadata for AI validation
        if (req.file) {
            validateWithSpringBootAI(issue._id, req.file.buffer, req.file.originalname, req.file.mimetype);
        } else {
            // Fallback to old AI service if no file buffer
            validateAndUpdateIssue(issue._id, imageUrl, description, category);
        }

        res.status(201).json({
            success: true,
            message: "Issue submitted successfully. AI validation in progress...",
            data: { issue }
        });
    } catch (error) {
        console.error("Error in submitIssue:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * Validate issue with Spring Boot AI backend
 * This runs asynchronously after issue creation
 */
async function validateWithSpringBootAI(issueId, imageBuffer, imageName, mimeType) {
    try {
        console.log(`🤖 Sending issue ${issueId} to Spring Boot AI backend...`);
        
        // Send image to Spring Boot AI backend
        const aiResult = await validateWithAIBackend(imageBuffer, imageName, mimeType);
        
        if (aiResult.success && aiResult.data) {
            console.log(`✅ AI validation successful for issue ${issueId}`);
            
            // Map AI response to our format
            const validation = mapAIResponse(aiResult.data);
            
            const updateData = {
                'aiValidation.validated': true,
                'aiValidation.confidence': validation.confidence,
                'aiValidation.validatedAt': new Date(),
                'aiValidation.matchesDescription': validation.matchesDescription,
                'aiValidation.aiResponse': validation.aiResponse,
                detectedCategory: validation.detectedCategory,
                confidenceScore: validation.confidence,
                severity: validation.severity
            };

            // Change status to "live" if validation passed
            if (validation.matchesDescription && validation.confidence > 0.6) {
                updateData.status = "live";
                console.log(`✅ Issue ${issueId} approved and set to LIVE`);
            } else {
                updateData.status = "rejected";
                console.log(`❌ Issue ${issueId} rejected by AI`);
            }

            await Issue.findByIdAndUpdate(issueId, updateData);
        } else {
            // Fallback: If AI backend fails, keep as pending or use fallback validation
            console.log(`⚠️ AI backend failed for issue ${issueId}, keeping as pending`);
            
            // Optional: Auto-approve after timeout or keep pending for manual review
            // await Issue.findByIdAndUpdate(issueId, { status: "live" });
        }
    } catch (error) {
        console.error(`❌ Error validating issue ${issueId}:`, error);
        
        // Keep issue as pending on error
        await Issue.findByIdAndUpdate(issueId, {
            'aiValidation.validated': false,
            'aiValidation.aiResponse': 'AI validation failed - pending manual review'
        });
    }
}

/**
 * Fallback validation using old AI service
 */
async function validateAndUpdateIssue(issueId, imageUrl, description, category) {
    try {
        const validation = await validateIssueWithAI(imageUrl, description, category);

        const updateData = {
            'aiValidation.validated': true,
            'aiValidation.confidence': validation.confidence,
            'aiValidation.validatedAt': new Date(),
            'aiValidation.matchesDescription': validation.matchesDescription,
            'aiValidation.aiResponse': validation.aiResponse,
            detectedCategory: validation.detectedCategory,
            confidenceScore: validation.confidence
        };

         if (validation.matchesDescription && validation.confidence > 0.7) {
            updateData.status = "live";
        } else {
            updateData.status = "rejected";
        }

        await Issue.findByIdAndUpdate(issueId, updateData);
    } catch (error) {
        console.error("Error in validateAndUpdateIssue:", error);
        
    }
}

 export const getLiveIssues = async (req, res) => {
    const startTime = Date.now();
    try {
        const { lat, lng, radius = 10000, category } = req.query;  

        let query = { status: "live" };

         if (category && category !== 'all') {
            query.category = category;
        }

        let issues;

         const selectFields = '_id title description category status imageUrl location severity upvotes createdAt aiValidation.validated aiValidation.confidence detectedCategory';

         if (lat && lng) {
            issues = await Issue.find({
                ...query,
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [parseFloat(lng), parseFloat(lat)]
                        },
                        $maxDistance: parseFloat(radius)
                    }
                }
            })
            .select(selectFields)
            .lean()
            .sort({ createdAt: -1 })
            .limit(100);
        } else {
             issues = await Issue.find(query)
                .select(selectFields)
                .lean()
                .sort({ createdAt: -1 })
                .limit(100);
        }

        res.status(200).json({
            success: true,
            count: issues.length,
            data: { issues }
        });
    } catch (error) {
        console.error("Error in getLiveIssues:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

 export const getUserIssues = async (req, res) => {
    try {
        const userId = req.user.userId; 
        const { status } = req.query;

        let query = { userId };
        
        if (status) {
            query.status = status;
        }

        const issues = await Issue.find(query)
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: issues.length,
            data: { issues }
        });
    } catch (error) {
        console.error("Error in getUserIssues:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get issue by ID
export const getIssueById = async (req, res) => {
    try {
        const { id } = req.params;

        const issue = await Issue.findById(id)
            .populate('userId', 'name phone city');

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: "Issue not found"
            });
        }

        res.status(200).json({
            success: true,
            data: { issue }
        });
    } catch (error) {
        console.error("Error in getIssueById:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Upvote issue
export const upvoteIssue = async (req, res) => {
    try {
        const { id } = req.params;

        const issue = await Issue.findByIdAndUpdate(
            id,
            { $inc: { upvotes: 1 } },
            { new: true }
        );

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: "Issue not found"
            });
        }

        res.status(200).json({
            success: true,
            data: { issue }
        });
    } catch (error) {
        console.error("Error in upvoteIssue:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

 export const deleteIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId || req.user._id;

         const issue = await Issue.findById(id);

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: "Issue not found"
            });
        }

         if (issue.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own issues"
            });
        }

         await Issue.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Issue deleted successfully"
        });
    } catch (error) {
        console.error("Error in deleteIssue:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
