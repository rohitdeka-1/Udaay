import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    issueId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Issue"
    },
    type: {
        type: String,
        enum: ["STATUS_UPDATE", "ASSIGNED", "RESOLVED", "REOPENED", "NEW_COMMENT", "VERIFICATION_COMPLETE", "VERIFICATION_REQUIRED"],
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH"],
        default: "MEDIUM"
    }
}, {
    timestamps: true
});

// Indexes for faster queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ issueId: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
