#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Simple test to verify AI validation flow
async function testAIValidation() {
    console.log('\n🧪 TESTING AI VALIDATION FLOW');
    console.log('='.repeat(80));

    try {
        // Create a simple test image (1x1 pixel PNG)
        const testImagePath = '/tmp/test_civic_issue.png';
        const pngBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
            0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
            0x00, 0x00, 0x03, 0x00, 0x01, 0x5B, 0x08, 0x2E, 0xE9, 0x00, 0x00, 0x00,
            0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);
        
        fs.writeFileSync(testImagePath, pngBuffer);
        console.log(`✅ Test image created: ${testImagePath}`);

        // Get JWT token by logging in
        console.log('\n📱 Step 1: Getting JWT token...');
        const phoneNumber = '+1234567890';
        const otpResponse = await axios.post('http://localhost:8000/auth/send-otp', {
            phone: phoneNumber
        });
        console.log(`✅ OTP sent to ${phoneNumber}`);
        console.log(`   Check terminal for OTP code`);

        // For testing, let's use a mock OTP (in real scenario, user would input this)
        // Since OTP is sent to terminal, we'll skip the actual submission
        
        console.log('\n✅ JWT token would be obtained from /auth/login after OTP verification');
        console.log('   For now, we\'ll test with a valid JWT...');

        // Get the JWT by doing a login with OTP
        // You can replace this with actual OTP verification
        const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaG9uZSI6IiswMTIzNDU2Nzg5MCIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjc0ODAwMDAwLCJleHAiOjE3MDc0MDAwMDB9.test';

        // Submit issue
        console.log('\n🎫 Step 2: Submitting civic issue...');
        const imageBuffer = fs.readFileSync(testImagePath);
        
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/png' });
        formData.append('image', blob, 'test_issue.png');
        formData.append('title', 'Test Pothole at Main Street');
        formData.append('description', 'Large pothole causing traffic hazard');
        formData.append('location', '40.7128,-74.0060');
        formData.append('category', 'pothole');

        const submitResponse = await axios.post(
            'http://localhost:8000/issues',
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${mockJWT}`,
                    'Content-Type': 'multipart/form-data'
                }
            }
        );

        console.log(`✅ Issue submitted successfully!`);
        console.log(`   Issue ID: ${submitResponse.data._id}`);
        console.log(`   Status: ${submitResponse.data.status}`);

        // Give servers time to process
        console.log('\n⏳ Waiting 5 seconds for AI validation...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check issue status
        console.log('\n🔍 Step 3: Checking AI validation result...');
        const statusResponse = await axios.get(
            `http://localhost:8000/issues/${submitResponse.data._id}`,
            {
                headers: {
                    'Authorization': `Bearer ${mockJWT}`
                }
            }
        );

        console.log(`✅ Issue Status Retrieved:`);
        console.log(`   Status: ${statusResponse.data.status}`);
        console.log(`   AI Validated: ${statusResponse.data.aiValidation?.validated}`);
        console.log(`   Confidence: ${statusResponse.data.aiValidation?.confidence}`);
        console.log(`   Service Used: ${statusResponse.data.aiValidation?.service}`);
        console.log(`   AI Response: ${statusResponse.data.aiValidation?.aiResponse}`);

        console.log('\n✅ Test completed successfully!');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error during test:');
        console.error(`   Status: ${error.response?.status}`);
        console.error(`   Message: ${error.message}`);
        console.error(`   Data: ${JSON.stringify(error.response?.data)}`);
        console.error('='.repeat(80));
        process.exit(1);
    }
}

// Run the test
testAIValidation();
