// import { Storage } from '@google-cloud/storage';
// import dotenv from 'dotenv';
// import { fileURLToPath } from 'url';
// import { dirname, resolve } from 'path';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// dotenv.config();

// async function createBucket() {
//     try {
//         const storage = new Storage({
//             keyFilename: resolve(__dirname, process.env.GOOGLE_CLOUD_KEY_FILE),
//             projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
//         });

//         const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
        
//         console.log(`Creating bucket: ${bucketName}...`);
        
//         // Create bucket with public access
//         const [bucket] = await storage.createBucket(bucketName, {
//             location: 'US',
//             storageClass: 'STANDARD',
//             iamConfiguration: {
//                 uniformBucketLevelAccess: {
//                     enabled: true
//                 }
//             }
//         });

//         console.log(`✅ Bucket ${bucket.name} created successfully!`);

//         // Make bucket publicly readable
//         console.log('Setting public access...');
//         await bucket.makePublic();
//         console.log('✅ Bucket is now publicly accessible!');

//         console.log('\n🎉 Setup complete! Your bucket is ready to use.');
//         console.log(`Bucket URL: https://storage.googleapis.com/${bucketName}/`);
        
//     } catch (error) {
//         if (error.code === 409) {
//             console.log('ℹ️  Bucket already exists. Checking permissions...');
            
//             const storage = new Storage({
//                 keyFilename: resolve(__dirname, process.env.GOOGLE_CLOUD_KEY_FILE),
//                 projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
//             });
            
//             const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME);
            
//             try {
//                 await bucket.makePublic();
//                 console.log('✅ Bucket permissions updated!');
//             } catch (permError) {
//                 console.log('ℹ️  Bucket already public or permissions already set.');
//             }
//         } else {
//             console.error('❌ Error:', error.message);
//             console.error('\nTroubleshooting:');
//             console.error('1. Check that your service account has "Storage Admin" role');
//             console.error('2. Verify your project ID and bucket name in .env');
//             console.error('3. Ensure billing is enabled for your GCP project');
//         }
//     }
// }

// createBucket();
