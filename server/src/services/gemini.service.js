import { GoogleAuth } from 'google-auth-library';
import config from '../config/env.config.js';

const PROJECT_ID = config.GOOGLE_CLOUD_PROJECT_ID || 'adroit-lock-485008-d6';
const LOCATION = 'us-central1';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const SERVICE_ACCOUNT_FILE = config.GOOGLE_CLOUD_KEY_FILE || './config/service-key.json';

let cachedAccessToken = null;
let tokenExpireTime = null;

/**
 * Get OAuth access token for Google Cloud APIs (for Vertex AI)
 */
export const getAccessToken = async () => {
    // Return cached token if still valid (refresh 5 min before expiry)
    if (cachedAccessToken && tokenExpireTime && Date.now() < tokenExpireTime - 5 * 60 * 1000) {
        return cachedAccessToken;
    }

    try {
        const auth = new GoogleAuth({
            keyFile: SERVICE_ACCOUNT_FILE,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        const client = await auth.getClient();
        const credentials = await client.getAccessToken();
        
        cachedAccessToken = credentials.token;
        tokenExpireTime = credentials.expiry_date;

        console.log('✅ Got new Google Auth token');
        return cachedAccessToken;
    } catch (error) {
        console.error('❌ Failed to get access token:', error.message);
        throw new Error('Failed to authenticate with Google Cloud');
    }
};

/**
 * Analyze image with Gemini API via Vertex AI
 */
export const analyzeWithGemini = async (imageBuffer, mimeType = 'image/jpeg') => {
    try {
        console.log('🤖 Starting Gemini analysis...');
        console.log(`   - Image size: ${imageBuffer.length} bytes`);
        console.log(`   - MIME type: ${mimeType}`);

        // Convert image to base64
        const base64Image = imageBuffer.toString('base64');

        // Get access token
        const accessToken = await getAccessToken();

        // Gemini endpoint
        const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

        // Prompt for civic issue validation
        const prompt = `You are a civic issue verification AI for an urban reporting system.

Analyze the provided image and:
1. Identify if it shows a civic issue (Garbage, Pothole, Drainage, Streetlight, WaterLeak, etc.)
2. Classify the issue type
3. Assess the severity/priority
4. Determine if this appears to be a legitimate public issue

If the image does NOT show a clear civic issue or appears to be spam/invalid, respond with "INVALID".

RESPOND WITH STRICT JSON ONLY (no markdown, no text before/after):
{
  "issue": "Issue type or INVALID",
  "confidence_reason": "Brief explanation of what was detected",
  "priority": "High/Medium/Low"
}`;

        // Build request body
        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Image
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 500
            },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_UNSPECIFIED',
                    threshold: 'BLOCK_NONE'
                }
            ]
        };

        console.log(`📤 Sending request to Vertex AI endpoint: ${endpoint.substring(0, 80)}...`);

        // Make API call
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Gemini API error (${response.status}):`, errorText);
            throw new Error(`Gemini API failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Got Gemini response');

        // Extract text from response
        if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
            throw new Error('Invalid Gemini response structure');
        }

        const text = result.candidates[0].content.parts[0].text.trim();
        console.log('📋 Gemini response text:', text.substring(0, 100) + '...');

        // Clean up markdown if present
        let jsonText = text;
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }

        // Parse JSON response
        const parsed = JSON.parse(jsonText);

        console.log('✅ Parsed Gemini response:', parsed);

        return {
            success: true,
            data: {
                issue: parsed.issue || 'INVALID',
                confidence_reason: parsed.confidence_reason || 'Unable to analyze image',
                priority: parsed.priority || 'Low'
            }
        };
    } catch (error) {
        console.error('❌ Gemini analysis error:', error.message);
        return {
            success: false,
            error: error.message,
            fallback: true
        };
    }
};

/**
 * Map Gemini response to standard validation format
 */
export const mapGeminiResponse = (geminiResponse) => {
    const { issue, confidence_reason, priority } = geminiResponse;

    const isValid = issue !== 'INVALID';
    const priorityMap = {
        'High': 0.9,
        'Medium': 0.7,
        'Low': 0.5,
        'high': 0.9,
        'medium': 0.7,
        'low': 0.5
    };

    const severityMap = {
        'High': 'high',
        'Medium': 'medium',
        'Low': 'low',
        'high': 'high',
        'medium': 'medium',
        'low': 'low'
    };

    return {
        validated: true,
        matchesDescription: isValid,
        confidence: isValid ? priorityMap[priority] || 0.7 : 0.2,
        aiResponse: confidence_reason,
        detectedCategory: isValid ? issue : 'unknown',
        severity: isValid ? severityMap[priority] || 'medium' : 'low'
    };
};
