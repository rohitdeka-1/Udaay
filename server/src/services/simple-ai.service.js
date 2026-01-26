/**
 * Simple AI Validation Service
 * Uses pattern matching and heuristics for civic issue validation
 * This is a fallback when Gemini API is unavailable due to permissions
 */

export const validateWithSimpleAI = async (imageBuffer, mimeType, title, description, category) => {
    try {
        console.log('🤖 Starting Simple AI Validation...');
        console.log(`   - Image size: ${imageBuffer.length} bytes`);
        console.log(`   - MIME type: ${mimeType}`);
        console.log(`   - Title: "${title}"`);
        console.log(`   - Description: "${description}"`);
        console.log(`   - Category: "${category}"`);

        // Check if description has civic issue keywords
        const civicKeywords = [
            'pothole', 'hole', 'crack', 'damaged', 'road', 'street',
            'garbage', 'trash', 'litter', 'waste', 'dirty', 'dump',
            'drainage', 'drain', 'water', 'flooded', 'flood', 'puddle',
            'streetlight', 'light', 'dark', 'lamp', 'broken light',
            'leak', 'leaking', 'water leak', 'pipe',
            'tree', 'branch', 'broken branch', 'fallen tree',
            'sidewalk', 'pavement', 'broken pavement',
            'traffic', 'sign', 'broken sign', 'missing sign'
        ];

        const spamKeywords = [
            'test', 'spam', 'fake', 'random', 'hello', 'demo',
            'advertisement', 'ad', 'promote', 'buy', 'sell'
        ];

        const descriptionLower = (description + ' ' + title).toLowerCase();
        
        // Count civic keywords
        const civicMatches = civicKeywords.filter(k => descriptionLower.includes(k)).length;
        const spamMatches = spamKeywords.filter(k => descriptionLower.includes(k)).length;

        // Calculate confidence
        const hasCivicKeywords = civicMatches > 0;
        const hasSpamKeywords = spamMatches > 0;
        const hasReasonableLength = description && description.length > 10;
        const hasImage = imageBuffer && imageBuffer.length > 100;

        let confidence = 0;
        let matchesDescription = false;
        let detectedCategory = category || 'unknown';
        let severity = 'medium';
        let aiResponse = '';

        if (hasSpamKeywords && civicMatches === 0) {
            // Likely spam
            confidence = 0.1;
            matchesDescription = false;
            aiResponse = 'Content appears to be spam or irrelevant to civic issues.';
            severity = 'low';
        } else if (hasCivicKeywords && hasImage && hasReasonableLength) {
            // Likely legitimate civic issue
            confidence = 0.85;
            matchesDescription = true;
            aiResponse = `Detected civic issue: ${civicMatches} matching civic keywords found in description.`;
            
            // Determine severity based on keywords
            const highSeverityWords = ['pothole', 'dangerous', 'hazard', 'flooding', 'emergency', 'broken'];
            const mediumSeverityWords = ['dirty', 'damaged', 'leak', 'branch'];
            const lowSeverityWords = ['trash', 'litter', 'tree'];
            
            if (highSeverityWords.some(w => descriptionLower.includes(w))) {
                severity = 'high';
            } else if (mediumSeverityWords.some(w => descriptionLower.includes(w))) {
                severity = 'medium';
            } else if (lowSeverityWords.some(w => descriptionLower.includes(w))) {
                severity = 'low';
            }
        } else if (hasCivicKeywords) {
            // Some civic keywords but maybe missing image or description
            confidence = 0.6;
            matchesDescription = true;
            aiResponse = `Likely civic issue based on keywords, though image validation is limited.`;
            severity = 'medium';
        } else if (hasImage && hasReasonableLength) {
            // Has image and description but no civic keywords - uncertain
            confidence = 0.4;
            matchesDescription = false;
            aiResponse = 'Submitted content does not clearly match a civic issue category.';
            severity = 'low';
        } else {
            // Insufficient data
            confidence = 0.2;
            matchesDescription = false;
            aiResponse = 'Insufficient information to validate as civic issue.';
            severity = 'low';
        }

        const result = {
            validated: true,
            matchesDescription,
            confidence,
            aiResponse,
            detectedCategory,
            severity
        };

        console.log('✅ Simple AI Validation Complete');
        console.log(`   - Confidence: ${(confidence * 100).toFixed(1)}%`);
        console.log(`   - Matches Description: ${matchesDescription}`);
        console.log(`   - Severity: ${severity}`);
        console.log(`   - Response: ${aiResponse}`);

        return result;

    } catch (error) {
        console.error('❌ Simple AI Validation Error:', error.message);
        return {
            validated: false,
            matchesDescription: false,
            confidence: 0,
            aiResponse: `Validation error: ${error.message}`,
            detectedCategory: 'unknown',
            severity: 'low'
        };
    }
};
