import mongoose from "mongoose";

const issueSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ["roads", "garbage", "water", "electricity", "other"]
    },
    imageUrl: {
        type: String,
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: [Number], // [longitude, latitude]
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        },
        address: {
            type: String,
            trim: true
        },
        city: {
            type: String,
            trim: true
        },
        state: {
            type: String,
            trim: true
        },
        country: {
            type: String,
            trim: true
        }
    },
    status: {
        type: String,
        enum: ["pending", "live", "in-progress", "awaiting-verification", "resolved", "rejected"],
        default: "pending"
    },
    aiValidation: {
        validated: {
            type: Boolean,
            default: false
        },
        confidence: {
            type: Number
        },
        validatedAt: {
            type: Date
        },
        matchesDescription: {
            type: Boolean
        },
        aiResponse: {
            type: String
        }
    },
    detectedCategory: {
        type: String,
        trim: true
    },
    confidenceScore: {
        type: Number,
        min: 0,
        max: 1
    },
    severity: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        default: "medium"
    },
    upvotes: {
        type: Number,
        default: 0
    },
    assignedDepartment: {
        type: String,
        trim: true
    },
    assignedOfficer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true
});

// Indexes for faster queries
issueSchema.index({ location: '2dsphere' });
issueSchema.index({ userId: 1 });
issueSchema.index({ status: 1, createdAt: -1 });
issueSchema.index({ assignedOfficer: 1 });
issueSchema.index({ createdAt: -1 });
issueSchema.index({ "location.city": 1 });
issueSchema.index({ severity: 1 });
issueSchema.index({ category: 1 });

const Issue = mongoose.model("Issue", issueSchema);

export default Issue;
