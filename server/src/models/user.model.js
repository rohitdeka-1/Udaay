import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    profilePicture: {
        type: String,
        default: null
    },
    authProvider: {
        type: String,
        enum: ["google", "email", "guest", "phone"],
        default: "phone"
    },
    role: {
        type: String,
        enum: ["citizen", "officer", "admin"],
        default: "citizen"
    },
    isVerified: {
        type: Boolean,
        default: true
    },
    reportsCount: {
        type: Number,
        default: 0
    },
    resolvedCount: {
        type: Number,
        default: 0
    },
    upvotesCount: {
        type: Number,
        default: 0
    },
    otp: {
        type: String,
        default: null
    },
    otpExpiry: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

userSchema.index({ role: 1 });

const User = mongoose.model("User", userSchema);

export default User;
