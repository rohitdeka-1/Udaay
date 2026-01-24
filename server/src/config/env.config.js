import dotenv from "dotenv"

dotenv.config();

const config = {
    PORT : process.env.PORT || 8080,
    NODE_ENV : process.env.NODE_ENV || process.env.ENV || "development",
    MONGO_URI : process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
    GOOGLE_CLOUD_BUCKET_NAME: process.env.GOOGLE_CLOUD_BUCKET_NAME,
    GOOGLE_CLOUD_KEY_FILE: process.env.GOOGLE_CLOUD_KEY_FILE,
    CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
    AI_BACKEND_URL: process.env.AI_BACKEND_URL || "http://localhost:5000",
    INTERNAL_JWT_SECRET: process.env.INTERNAL_JWT_SECRET
}

 if (config.NODE_ENV === 'production') {
    const required = ['MONGO_URI', 'JWT_SECRET', 'GOOGLE_CLOUD_PROJECT_ID', 'GOOGLE_CLOUD_BUCKET_NAME'];
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
        console.error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
}

export default config;