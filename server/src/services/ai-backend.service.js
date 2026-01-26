import axios from 'axios';
import FormData from 'form-data';
import jwt from 'jsonwebtoken';
import config from '../config/env.config.js';

const AI_BACKEND_URL = config.AI_BACKEND_URL || 'http://localhost:5000';
const INTERNAL_JWT_SECRET = config.INTERNAL_JWT_SECRET;

/**
 * Generate internal JWT token for Spring Boot authentication
 * Required claims: issuer='civicfix-backend', role='INTERNAL_SERVICE'
 */

const generateInternalJWT = () => {
    if (!INTERNAL_JWT_SECRET) {
        console.error('❌ INTERNAL_JWT_SECRET is missing in .env file!');
        throw new Error('INTERNAL_JWT_SECRET is required for AI backend authentication');
    }
    
    console.log(`🔐 Generating internal JWT token...`);
    console.log(`   - Secret length: ${INTERNAL_JWT_SECRET.length} chars`);
    
    const token = jwt.sign(
        { role: 'INTERNAL_SERVICE' },
        INTERNAL_JWT_SECRET,
        {
            issuer: 'civicfix-backend',
            expiresIn: '1h'
        }
    );
    
    console.log(`✅ JWT Generated: ${token.substring(0, 50)}...`);
    return token;
};

/**
 * Send image to Spring Boot AI backend for validation
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} imageName - Original image name
 * @param {string} mimeType - Image MIME type
 * @returns {Promise<Object>} AI validation response
 */
export const validateWithAIBackend = async (imageBuffer, imageName, mimeType) => {
    try {
        console.log('\n🔄=================================================');
        console.log('📤 CALLING SPRING BOOT AI BACKEND');
        console.log('=================================================');
        console.log(`📋 Image Details:`);
        console.log(`   - Name: ${imageName}`);
        console.log(`   - MIME type: ${mimeType}`);
        console.log(`   - Buffer size: ${imageBuffer.length} bytes`);
        console.log(`   - Valid Buffer: ${Buffer.isBuffer(imageBuffer) ? '✅ YES' : '❌ NO'}`);
        
        const formData = new FormData();
        formData.append('image', imageBuffer, {
            filename: imageName,
            contentType: mimeType
        });

        const jwtToken = generateInternalJWT();
        
        console.log(`\n🌐 Spring Boot AI Backend URL: ${AI_BACKEND_URL}/ai/verify`);
        console.log(`🔐 Authorization: Bearer ${jwtToken.substring(0, 30)}...`);
        
        console.log(`\n📤 Sending FormData with image...`);
        const response = await axios.post(
            `${AI_BACKEND_URL}/ai/verify`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${jwtToken}`
                },
                timeout: 30000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );
        
        console.log(`\n✅ Spring Boot Response Received:`);
        console.log(`   - Status Code: ${response.status}`);
        console.log(`   - Response Data:`, JSON.stringify(response.data, null, 2));

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('\n❌=================================================');
        console.error('❌ AI BACKEND VALIDATION FAILED');
        console.error('=================================================');
        console.error(`Error: ${error.message}`);
        
        if (error.response) {
            console.error(`\n📌 Response Status: ${error.response.status}`);
            console.error(`📌 Response Data:`, JSON.stringify(error.response.data, null, 2));
            console.error(`📌 Response Headers:`, error.response.headers);
        } else if (error.request) {
            console.error(`\n❌ No response received from Spring Boot`);
            console.error(`❌ Is Spring Boot running on ${AI_BACKEND_URL}?`);
            console.error(`❌ Check: curl http://localhost:5000/actuator/health`);
        } else {
            console.error(`\n❌ Error setting up request:`, error.message);
        }
        
        return {
            success: false,
            error: error.message,
            fallback: true
        };
    }
};

/**
 * Map AI backend response to issue validation format
 * @param {Object} aiResponse - Response from Spring Boot AI
 * @returns {Object} Formatted validation result
 */
export const mapAIResponse = (aiResponse) => {
    const { issue, confidence_reason, priority } = aiResponse;
    
    const categoryMap = {
        'road': 'roads',
        'roads': 'roads',
        'pothole': 'roads',
        'garbage': 'garbage',
        'waste': 'garbage',
        'trash': 'garbage',
        'water': 'water',
        'drainage': 'water',
        'leak': 'water',
        'electricity': 'electricity',
        'power': 'electricity',
        'streetlight': 'electricity'
    };
    
    const detectedCategory = Object.keys(categoryMap).find(key => 
        issue?.toLowerCase().includes(key)
    );
    
    // Map priority to confidence and severity
    const priorityMap = {
        'high': { confidence: 0.9, severity: 'high' },
        'medium': { confidence: 0.75, severity: 'medium' },
        'low': { confidence: 0.6, severity: 'low' }
    };
    
    const mappedPriority = priorityMap[priority?.toLowerCase()] || { confidence: 0.7, severity: 'medium' };
    
    return {
        validated: true,
        confidence: mappedPriority.confidence,
        detectedCategory: categoryMap[detectedCategory] || 'other',
        matchesDescription: mappedPriority.confidence > 0.6,
        aiResponse: confidence_reason || 'AI validation completed',
        severity: mappedPriority.severity,
        issueType: issue || 'Unknown'
    };
};

/**
 * Check if AI backend is healthy
 * @returns {Promise<boolean>}
 */
export const checkAIBackendHealth = async () => {
    try {
        const response = await axios.get(`${AI_BACKEND_URL}/health`, {
            timeout: 5000
        });
        return response.status === 200;
    } catch (error) {
        console.error('❌ AI Backend health check failed:', error.message);
        return false;
    }
};
