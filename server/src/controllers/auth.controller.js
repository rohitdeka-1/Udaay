import admin, { firebaseInitialized } from "../config/firebase.config.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

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
