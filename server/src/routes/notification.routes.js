import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import Notification from "../models/notification.model.js";

const router = express.Router();

// Get user notifications (no auth required for now)
router.get("/", async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        const notifications = await Notification.find({ userId })
            .populate('issueId', 'title category status')
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            data: { notifications }
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Mark notification as read (no auth required for now)
router.patch("/:id/read", async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findByIdAndUpdate(
            id,
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        res.status(200).json({
            success: true,
            data: { notification }
        });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Mark all notifications as read for a user (no auth required for now)
router.patch("/read-all", async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true }
        );

        res.status(200).json({
            success: true,
            message: "All notifications marked as read"
        });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Get unread count (no auth required for now)
router.get("/unread-count", async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        const count = await Notification.countDocuments({ userId, isRead: false });

        res.status(200).json({
            success: true,
            data: { count }
        });
    } catch (error) {
        console.error("Error getting unread count:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

export default router;
