import express from "express"
import cors from "cors";
import helmet from "helmet";
import connectDb from "./db/connect.db.js";
import config from "./config/env.config.js";
import cookieParser from 'cookie-parser';
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import issueRoutes from "./routes/issue.routes.js";

const app = express();
const PORT = config.PORT;
const isProduction = config.NODE_ENV === 'production';

const allowedOrigins = isProduction
    ? [
        config.CLIENT_URL, 
        process.env.FRONTEND_URL,
        /^https:\/\/.*\.vercel\.app$/,
        'http://34.100.170.102',
        'http://34.100.170.102:80',
        'http://34.100.170.102:8080',
        'https://udaay.vercel.app'
      ].filter(val => val && val !== 'undefined')
    : ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:8080', 'http://127.0.0.1:8081'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.some(allowed => {
            if (typeof allowed === 'string') {
                return origin === allowed || origin.startsWith(allowed);
            }
            if (allowed instanceof RegExp) {
                return allowed.test(origin);
            }
            return false;
        });

        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length', 'X-Request-Id']
}));

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json({
    limit: "10MB"
}));

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// Enable request logging for all environments to aid debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.NODE_ENV
    });
});

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Udaay API Server is running",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/issues", issueRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

app.use((err, req, res, next) => {
    console.error(' Error:', err.message);
    if (!isProduction) {
        console.error(err.stack);
    }

    res.status(err.status || 500).json({
        success: false,
        message: isProduction ? 'Internal server error' : err.message,
        ...((!isProduction && err.stack) && { stack: err.stack })
    });
});

let server;

try {
    await connectDb();
    console.log('✅ Database connected successfully');

    server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n${'🚀'.repeat(20)}`);
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📍 Environment: ${config.NODE_ENV}`);
        console.log(`🌐 Health check: http://localhost:${PORT}/health`);

        // Log JWT credentials
        console.log(`\n🔐 SECURITY CONFIGURATION:`);
        console.log(`   - JWT_SECRET: ${config.JWT_SECRET ? '✅ SET (' + config.JWT_SECRET.length + ' chars)' : '❌ MISSING'}`);
        console.log(`   - INTERNAL_JWT_SECRET: ${config.INTERNAL_JWT_SECRET ? '✅ SET (' + config.INTERNAL_JWT_SECRET.length + ' chars)' : '❌ MISSING'}`);
        console.log(`   - AI Backend URL: ${config.AI_BACKEND_URL || 'http://localhost:5000'}`);

        // Log AI integration status
        console.log(`\n🤖 AI INTEGRATION:`);
        console.log(`   - Gemini Service: ✅ ENABLED (Direct)`);
        console.log(`   - Spring Boot Fallback: ✅ ENABLED (${config.AI_BACKEND_URL || 'http://localhost:5000'})`);
        console.log(`   - Google Cloud Project: ${config.GOOGLE_CLOUD_PROJECT_ID || 'Not configured'}`);

        if (!isProduction) {
            console.log(`\n📡 API: http://localhost:${PORT}`);
        }
        console.log(`${'🚀'.repeat(20)}\n`);
    });
} catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
}

const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    if (server) {
        server.close(async () => {
            console.log('✅ HTTP server closed');

            try {
                await import('mongoose').then(mongoose => mongoose.default.connection.close());
                console.log('✅ Database connection closed');
                process.exit(0);
            } catch (err) {
                console.error('❌ Error during shutdown:', err);
                process.exit(1);
            }
        });

        setTimeout(() => {
            console.error('⚠️  Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
