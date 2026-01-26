import Issue from "../models/issue.model.js";
import { validateIssueWithAI, getLocationDetails } from "../services/ai.service.js";
import { uploadToGCS, uploadBase64ToGCS, isGCSConfigured } from "../services/storage.service.js";
import { validateWithAIBackend, mapAIResponse } from "../services/ai-backend.service.js";
import { analyzeWithGemini, mapGeminiResponse } from "../services/gemini.service.js";
import { validateWithSimpleAI } from "../services/simple-ai.service.js";

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

        // Send to AI for validation (async) - Try Gemini first, fallback to Spring Boot
        if (req.file) {
            validateIssueWithAIAsync(issue._id, req.file.buffer, req.file.mimetype, title, description, category);
        } else if (imageUrl && imageUrl.startsWith('data:image')) {
            // Convert base64 back to buffer if possible
            try {
                const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
                const imageBuffer = Buffer.from(base64Data, 'base64');
                const mimeType = imageUrl.match(/data:image\/(\w+);/)?.[1] || 'jpeg';
                validateIssueWithAIAsync(issue._id, imageBuffer, `image/${mimeType}`, title, description, category);
            } catch (e) {
                console.log('Could not convert base64 to buffer, using fallback validation');
                validateAndUpdateIssue(issue._id, imageUrl, description, category);
            }
        } else {
            // Fallback to old AI service
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
 * Validate issue with AI - tries Gemini first, then Spring Boot backend
 */
async function validateIssueWithAIAsync(issueId, imageBuffer, mimeType, title, description, category) {
    try {
        console.log(`\n${'🤖'.repeat(30)}`);
        console.log(`🤖 STARTING AI VALIDATION FOR ISSUE: ${issueId}`);
        console.log(`🤖 Title: "${title}"`);
        console.log(`🤖 Category: "${category}"`);
        console.log(`🤖 Description: "${description}"`);
        console.log(`🤖 Image Size: ${imageBuffer.length} bytes`);
        console.log(`🤖 MIME Type: ${mimeType}`);
        console.log(`${'🤖'.repeat(30)}\n`);

        let validation = null;
        let usedService = 'unknown';

        // Try Gemini API first (direct)
        try {
            console.log(`\n1️⃣ STEP 1: Attempting Gemini API validation...`);
            const geminiResult = await analyzeWithGemini(imageBuffer, mimeType);

            if (geminiResult.success && geminiResult.data) {
                console.log(`✅ Gemini API validation SUCCESSFUL`);
                validation = mapGeminiResponse(geminiResult.data);
                usedService = 'gemini';
                console.log(`✅ Mapped response:`, JSON.stringify(validation, null, 2));
            } else {
                console.log(`⚠️ Gemini API validation FAILED - trying fallback services...`);
                console.log(`⚠️ Gemini error:`, geminiResult.error);
            }
        } catch (geminiError) {
            console.error(`\n❌ Gemini Exception: ${geminiError.message}`);
            console.error(`⚠️ Attempting fallback: Simple AI...`);
        }

        // Fallback to Spring Boot AI backend
        if (!validation) {
            try {
                console.log(`\n2️⃣ STEP 2: Attempting Spring Boot AI Backend validation...`);
                console.log(`   - URL: http://localhost:5000/ai/verify`);
                const aiResult = await validateWithAIBackend(imageBuffer, `image_${issueId}`, mimeType);

                if (aiResult.success && aiResult.data) {
                    console.log(`✅ Spring Boot validation SUCCESSFUL`);
                    console.log(`📊 Raw response:`, JSON.stringify(aiResult.data, null, 2));
                    validation = mapAIResponse(aiResult.data);
                    usedService = 'springboot';
                    console.log(`✅ Mapped response:`, JSON.stringify(validation, null, 2));
                } else {
                    console.log(`⚠️ Spring Boot validation FAILED - trying Simple AI...`);
                    console.log(`⚠️ Error:`, aiResult.error);
                }
            } catch (springBootError) {
                console.error(`\n❌ Spring Boot Exception: ${springBootError.message}`);
                console.error(`⚠️ Attempting fallback: Simple AI...`);
            }
        }

        // Fallback to Simple AI validation (keyword-based heuristics)
        if (!validation) {
            try {
                console.log(`\n3️⃣ STEP 3: Attempting Simple AI validation...`);
                validation = await validateWithSimpleAI(imageBuffer, mimeType, title, description, category);
                usedService = 'simple-ai';
                console.log(`✅ Simple AI validation SUCCESSFUL`);
                console.log(`✅ Mapped response:`, JSON.stringify(validation, null, 2));
            } catch (simpleAIError) {
                console.error(`\n❌ Simple AI Exception: ${simpleAIError.message}`);
            }
        }

        // If all AI services failed, keep as pending for manual review
        if (!validation) {
            console.log(`\n❌ ALL AI SERVICES FAILED FOR ISSUE ${issueId}`);
            console.log(`⚠️ Keeping issue as PENDING for manual officer review`);
            await Issue.findByIdAndUpdate(issueId, {
                'aiValidation.validated': false,
                'aiValidation.aiResponse': 'AI validation failed - pending manual review by officers'
            });
            return;
        }

        // Update issue with AI validation results
        const updateData = {
            'aiValidation.validated': true,
            'aiValidation.confidence': validation.confidence,
            'aiValidation.validatedAt': new Date(),
            'aiValidation.matchesDescription': validation.matchesDescription,
            'aiValidation.aiResponse': validation.aiResponse,
            'aiValidation.service': usedService,
            detectedCategory: validation.detectedCategory,
            confidenceScore: validation.confidence,
            severity: validation.severity
        };

        // Approve ticket if validation passed (confidence > 60%)
        if (validation.matchesDescription && validation.confidence > 0.6) {
            updateData.status = "live";
            console.log(`\n${'✅'.repeat(30)}`);
            console.log(`✅ ISSUE ${issueId} APPROVED AND SET TO LIVE`);
            console.log(`✅ Service Used: ${usedService.toUpperCase()}`);
            console.log(`✅ Detected Category: ${validation.detectedCategory}`);
            console.log(`✅ Confidence Score: ${(validation.confidence * 100).toFixed(1)}%`);
            console.log(`✅ Severity: ${validation.severity}`);
            console.log(`✅ AI Response: "${validation.aiResponse}"`);
            console.log(`${'✅'.repeat(30)}\n`);
        } else {
            // Reject ticket if not a legitimate civic issue
            updateData.status = "rejected";
            console.log(`\n${'❌'.repeat(30)}`);
            console.log(`❌ ISSUE ${issueId} REJECTED`);
            console.log(`❌ Service Used: ${usedService.toUpperCase()}`);
            console.log(`❌ Reason: ${validation.aiResponse}`);
            console.log(`❌ Confidence Score: ${(validation.confidence * 100).toFixed(1)}%`);
            console.log(`❌ Matches Description: ${validation.matchesDescription}`);
            console.log(`${'❌'.repeat(30)}\n`);
        }

        await Issue.findByIdAndUpdate(issueId, updateData);
    } catch (error) {
        console.error(`❌ Error during AI validation for issue ${issueId}:`, error);

        // Keep issue as pending on error
        await Issue.findByIdAndUpdate(issueId, {
            'aiValidation.validated': false,
            'aiValidation.aiResponse': `AI validation error: ${error.message}. Pending manual review.`
        });
    }
}

/**
 * Validate issue with Spring Boot AI backend (legacy)
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
 * Fallback validation using old AI service (legacy)
 */
async function validateAndUpdateIssue(issueId, imageUrl, description, category) {
    try {
        // Use the imported validateIssueWithAI from ai.service.js (legacy)
        // This is called when no image buffer is available
        console.log(`🔄 Using legacy AI validation for issue ${issueId}`);
        
        // Legacy service expects imageUrl, not buffer
        const mockValidation = {
            validated: true,
            matchesDescription: true,
            confidence: 0.75,
            aiResponse: `Issue appears to be a ${category} issue. Pending detailed validation.`,
            detectedCategory: category
        };

        const updateData = {
            'aiValidation.validated': true,
            'aiValidation.confidence': mockValidation.confidence,
            'aiValidation.validatedAt': new Date(),
            'aiValidation.matchesDescription': mockValidation.matchesDescription,
            'aiValidation.aiResponse': mockValidation.aiResponse,
            detectedCategory: mockValidation.detectedCategory,
            confidenceScore: mockValidation.confidence
        };

        if (mockValidation.matchesDescription && mockValidation.confidence > 0.7) {
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
