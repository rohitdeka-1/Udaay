import express from "express";
import {
    submitIssue,
    getLiveIssues,
    getUserIssues,
    getIssueById,
    upvoteIssue,
    updateIssueStatus,
    deleteIssue
} from "../controllers/issue.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";

const router = express.Router();

// Submit new issue (protected) - supports both file upload and base64
router.post("/submit", verifyToken, uploadSingle('image'), submitIssue);

// Get live issues (public - for map and issues list)
router.get("/live", getLiveIssues);

// Get user's own issues (protected)
router.get("/my-issues", verifyToken, getUserIssues);

// Get issue by ID (public)
router.get("/:id", getIssueById);

// Update issue status/severity (protected - for officers)
router.patch("/:id", verifyToken, updateIssueStatus);

// Upvote issue (public)
router.post("/:id/upvote", upvoteIssue);

// Delete issue (protected - only owner can delete)
router.delete("/:id", verifyToken, deleteIssue);

export default router;
