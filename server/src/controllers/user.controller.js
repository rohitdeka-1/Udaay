import User from "../models/user.model.js";
import { uploadToGCS, uploadBase64ToGCS, deleteFromGCS, isGCSConfigured } from "../services/storage.service.js";

export const getMe = async (req, res) => {
    try {
        
        const userId = req.user._id || req.user.userId;
        
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            data: {
                user: {
                    _id: user._id,
                    id: user._id,
                    phone: user.phone,
                    name: user.name || "Citizen",
                    city: user.city || "India",
                    profilePicture: user.profilePicture,
                    createdAt: user.createdAt,
                    memberSince: user.createdAt,
                    verified: user.isVerified || true,
                    isVerified: user.isVerified || true,
                    issuesReported: user.reportsCount || 0,
                    issuesResolved: user.resolvedCount || 0,
                    stats: {
                        reports: user.reportsCount || 0,
                        resolved: user.resolvedCount || 0,
                        upvotes: user.upvotesCount || 0
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error in getMe:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
         
        const userId = req.user._id || req.user.userId;
        const { name, city } = req.body;
        let updateData = { name, city };

        
        if (req.file) {
            const user = await User.findById(userId);
            
            if (isGCSConfigured()) {
                try {
                   
                    if (user.profilePicture && !user.profilePicture.startsWith('data:')) {
                        await deleteFromGCS(user.profilePicture);
                    }

                     
                    const profilePictureUrl = await uploadToGCS(
                        req.file.buffer,
                        req.file.originalname,
                        'profiles',
                        req.file.mimetype
                    );
                    
                    updateData.profilePicture = profilePictureUrl;
                } catch (gcsError) {
                    console.log('GCS upload failed, falling back to base64:', gcsError.message);
                    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
                    updateData.profilePicture = base64Image;
                }
            } else {
                
                const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
                updateData.profilePicture = base64Image;
                console.log('GCS not configured - using base64 storage for profile picture');
            }
        }
       
        else if (req.body.profilePicture && req.body.profilePicture.startsWith('data:image')) {
            if (isGCSConfigured()) {
                try {
                    const user = await User.findById(userId);
                    
                    if (user.profilePicture && !user.profilePicture.startsWith('data:')) {
                        await deleteFromGCS(user.profilePicture);
                    }

                    const profilePictureUrl = await uploadBase64ToGCS(req.body.profilePicture, 'profiles');
                    updateData.profilePicture = profilePictureUrl;
                } catch (gcsError) {
                    console.log('GCS upload failed, keeping base64:', gcsError.message);
                    updateData.profilePicture = req.body.profilePicture;
                }
            } else {
                
                updateData.profilePicture = req.body.profilePicture;
            }
        }

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: { 
                user: {
                    ...user.toObject(),
                    issuesReported: user.reportsCount || 0,
                    issuesResolved: user.resolvedCount || 0
                }
            }
        });
    } catch (error) {
        console.error("Error in updateProfile:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
