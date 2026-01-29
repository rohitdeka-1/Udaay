import admin, { firebaseInitialized } from "../config/firebase.config.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

// Store OTP data in memory (in production, use Redis)
const otpStore = {};

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTP = async (req, res) => {
    try {
        console.log('\n🔵 sendOTP endpoint hit');
        console.log('📦 Request body:', req.body);
        
        // Accept both 'phone' and 'phoneNumber' for compatibility
        const phone = req.body?.phone || req.body?.phoneNumber;
        console.log('📱 Phone value:', phone);

        if (!phone) {
            console.log('❌ NO PHONE PROVIDED');
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        // Test user bypass
        if (phone === '+919876543210') {
            console.log('🧪 TEST USER MODE: Phone +919876543210 detected');
            otpStore[phone] = {
                otp: '123456',
                expiryTime: Date.now() + 10 * 60 * 1000,
                attempts: 0
            };
            
            return res.status(200).json({
                success: true,
                message: "Test user OTP is always 123456",
                data: {
                    phone,
                    expiresIn: "10 minutes",
                    prototypeOTP: '123456' // For frontend toast
                }
            });
        }

        const otp = generateOTP();
        const expiryTime = Date.now() + 10 * 60 * 1000;

        otpStore[phone] = {
            otp,
            expiryTime,
            attempts: 0
        };

        console.log(`\n===========================================`);
        console.log(`⚠️  PROTOTYPE MODE - OTP AUTHENTICATION`);
        console.log(`===========================================`);
        console.log(`📱 Phone: ${phone}`);
        console.log(`🔐 OTP Code: ${otp}`);
        console.log(`⏰ Expires in: 10 minutes`);
        console.log(`⚠️  This OTP is logged for testing only!`);
        console.log(`===========================================\n`);

        res.status(200).json({
            success: true,
            message: "OTP sent successfully to your phone",
            data: {
                phone,
                expiresIn: "10 minutes",
                prototypeOTP: otp // Return OTP for frontend toast
            }
        });

    } catch (error) {
        console.error("Send OTP error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during OTP send",
            error: error.message
        });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: "Phone number and OTP are required"
            });
        }

        // Test user bypass
        if (phone === '+919876543210' && otp === '123456') {
            console.log('🧪 TEST USER MODE: Test credentials verified');
            
            let user = await User.findOne({ phone });
            if (!user) {
                user = await User.create({
                    name: "Test User",
                    phone,
                    email: "testuser@lakecity.local",
                    authProvider: "phone",
                    role: "citizen",
                    isVerified: true
                });
            }

            const token = jwt.sign(
                { userId: user._id, role: user.role, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: "30d" }
            );

            user.lastLogin = new Date();
            await user.save();

            return res.status(200).json({
                success: true,
                message: "Test user login successful",
                data: {
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        role: user.role,
                        authProvider: user.authProvider
                    },
                    token,
                    expiresIn: "30d"
                }
            });
        }

        // Check if OTP exists
        if (!otpStore[phone]) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request a new OTP"
            });
        }

        const storedOTPData = otpStore[phone];

        // Check if OTP is expired
        if (Date.now() > storedOTPData.expiryTime) {
            delete otpStore[phone];
            return res.status(400).json({
                success: false,
                message: "OTP expired. Please request a new OTP"
            });
        }

        // Check if OTP matches
        if (storedOTPData.otp !== otp) {
            storedOTPData.attempts += 1;
            if (storedOTPData.attempts >= 3) {
                delete otpStore[phone];
                return res.status(400).json({
                    success: false,
                    message: "Too many failed attempts. Please request a new OTP"
                });
            }
            return res.status(400).json({
                success: false,
                message: `Invalid OTP. Attempts remaining: ${3 - storedOTPData.attempts}`
            });
        }

        // OTP is valid - clear it
        delete otpStore[phone];

        // Find or create user
        let user = await User.findOne({ phone });

        if (!user) {
            user = await User.create({
                name: "User",
                phone,
                email: `${phone}@lakecity.local`,
                authProvider: "phone",
                role: "citizen",
                isVerified: true
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        user.lastLogin = new Date();
        await user.save();

        console.log(`✅ User logged in via OTP: ${phone}`);

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    authProvider: user.authProvider
                },
                token,
                expiresIn: "30d"
            }
        });

    } catch (error) {
        console.error("Verify OTP error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during OTP verification",
            error: error.message
        });
    }
};

export const loginWithFirebase = async (req, res) => {
    try {
        const { idToken, phone, name, email } = req.body;

        let decodedToken;
        
        if (!firebaseInitialized) {
            // Fallback to dev mode only if Firebase is not initialized
            console.log("DEV MODE: Firebase not initialized");
            
            if (!phone) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number is required in dev mode"
                });
            }
            
            decodedToken = {
                uid: `dev_${phone}`,
                phone_number: phone,
                email: email || `${phone}@dev.com`,
                name: name || "Test User"
            };
        } else {
            // Firebase is initialized - require idToken
            if (!idToken) {
                return res.status(400).json({
                    success: false,
                    message: "Firebase ID token is required"
                });
            }

            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            } catch (error) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid or expired token",
                    error: error.message
                });
            }
        }

        const { uid, phone_number, email: fbEmail, name: fbName } = decodedToken;

        let user = await User.findOne({ 
            $or: [
                { email: fbEmail || email },
                { phone: phone_number || phone }
            ]
        });

        if (!user) {
            user = await User.create({
                name: fbName || name || "User",
                email: fbEmail || email || `${uid}@guest.com`,
                phone: phone_number || phone,
                authProvider: phone_number ? "google" : "guest",
                role: "citizen"
            });
        }

        const token = jwt.sign(
            { 
                userId: user._id, 
                role: user.role,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        user.lastLogin = new Date();
        await user.save();

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    authProvider: user.authProvider
                },
                token,
                expiresIn: "30d"
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during login",
            error: error.message
        });
    }
};

export const verifyPhoneNumber = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        res.status(200).json({
            success: true,
            message: "OTP sent successfully. Verify on client side with Firebase."
        });

    } catch (error) {
        console.error("Phone verification error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during phone verification",
            error: error.message
        });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-__v");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            data: { user }
        });

    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

export const logout = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: "Logout successful"
        });

    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during logout",
            error: error.message
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;
        const userId = req.user.userId;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (name) user.name = name;
        if (phone) user.phone = phone;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: { user }
        });

    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during profile update",
            error: error.message
        });
    }
};
