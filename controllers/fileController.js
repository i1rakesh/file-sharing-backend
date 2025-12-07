
const File = require('../models/File');
const User = require('../models/User');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs').promises; 
const path = require('path');
const { logActivity } = require('../utils/audit'); 
const LOG_FILE = path.join(__dirname, '..', 'audit.log');
exports.uploadFiles = async (req, res) => {

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded.' });
    }

    try {
        const fileDocuments = req.files.map(file => ({
            filename: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            storageUrl: file.path, // Cloudinary path/URL
            ownerId: req.user._id, // User ID attached by the 'protect' middleware
        }));

        const result = await File.insertMany(fileDocuments);

        res.status(201).json({
            message: `${result.length} files uploaded and saved successfully.`,
            files: result,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error saving file metadata.', error: error.message });
    }
};



exports.getFiles = async (req, res) => {
    try {
        const files = await File.find({
            $or: [
                { ownerId: req.user._id },
                { 'authorizedUsers.user': req.user._id } 
            ]
        })
        .select('-shareLinkToken -shareLinkExpiresAt'); 

        const filteredFiles = files.filter(file => {

            if (file.ownerId.equals(req.user._id)) {
                return true;
            }

            const authEntry = file.authorizedUsers.find(
                auth => auth.user.equals(req.user._id)
            );
            
            if (authEntry) {
                return !authEntry.expiresAt || authEntry.expiresAt > new Date();
            }

            return false;
        });
        res.status(200).json(filteredFiles);
    } catch (error) {
        res.status(500).json({ message: 'Server error retrieving files.', error: error.message });
    }
};


exports.downloadFile = async (req, res) => {
    const fileId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(404).json({ message: 'Invalid File ID.' });
    }

    try {
        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).json({ message: 'File not found.' });
        }

        const isOwner = file.ownerId.equals(userId);

        const authEntry = file.authorizedUsers.find(
            // Use .equals() for comparison with ObjectId
            auth => auth.user.equals(userId)
        );
    
        let isAuthorizedAndNotExpired = false;
        if (authEntry) {
            if (!authEntry.expiresAt || authEntry.expiresAt > new Date()) {
                isAuthorizedAndNotExpired = true; 
            }
        }

        if (isOwner || isAuthorizedAndNotExpired) {
            //For logs
            const role = isOwner ? 'Owner' : 'Viewer';
            await logActivity(userId, fileId, 'DOWNLOAD', `Downloaded via Dashboard by ${role}.`);

            try {
                // Fetch the file stream from the storage URL
                const response = await axios({
                    method: 'get',
                    url: file.storageUrl,
                    responseType: 'stream' // Important for streaming large files efficiently
                });

                // Set explicit headers to control the download
                res.setHeader('Content-Type', file.fileType); // Use the stored MIME type (e.g., application/pdf)
                res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`); // Force download

                // Pipe the file stream directly to the client's response
                response.data.pipe(res);

                // Handle streaming errors
                response.data.on('error', (err) => {
                    console.error('Streaming error during dashboard download:', err);
                    if (!res.headersSent) {
                        res.status(500).json({ message: 'Error streaming file content.' });
                    }
                });
                
                return; // Return to prevent further execution

            } catch (downloadError) {
                console.error('File download stream error:', downloadError.message);
                return res.status(500).json({ message: 'Failed to retrieve file from storage URL.' });
            }
        } else {
            return res.status(403).json({ message: 'Access Denied: Your authorization has expired or you are not permitted.' });
        }

    } catch (error) {
        res.status(500).json({ message: 'Server error during download check.', error: error.message });
    }
};


exports.shareFileWithUsers = async (req, res) => {
    const fileId = req.params.id;
    const { targetEmails, expiresInHours = 72 } = req.body;
    const ownerId = req.user._id;
    const User = require('../models/User'); 

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(404).json({ message: 'Invalid File ID.' });
    }

    try {
        const file = await File.findById(fileId);
        // ... (file not found and owner check) ...

        const targetUsers = await User.find({ email: { $in: targetEmails } }).select('_id');
        const targetUserIds = targetUsers.map(u => u._id);

        if (targetUserIds.length === 0) {
            return res.status(404).json({ message: 'No valid users found to share with.' });
        }

        // Calculate expiry time
        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

        const newAuthorizedUsers = targetUserIds.map(userId => ({
            user: userId,
            expiresAt: expiresAt,
        }));
        
        const updatedFile = await File.findByIdAndUpdate(
            fileId,
            { $push: { authorizedUsers: { $each: newAuthorizedUsers } } },
            { new: true }
        );
        const sharedEmails = targetEmails.join(', ');
        await logActivity(ownerId, fileId, 'SHARED_WITH_USER', `Shared with users: ${sharedEmails}. Expires in ${expiresInHours}h.`);
        res.status(200).json({ 
            message: `${targetUserIds.length} users successfully granted access until ${expiresAt.toLocaleString()}.`,
            file: updatedFile
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error during sharing.', error: error.message });
    }
};

exports.generateShareLink = async (req, res) => {
    const fileId = req.params.id;
    const ownerId = req.user._id;
    const { expiresInHours = 24 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(404).json({ message: 'Invalid File ID.' });
    }

    try {
        let file = await File.findById(fileId);

        if (!file) {
            return res.status(404).json({ message: 'File not found.' });
        }

        if (!file.ownerId.equals(ownerId)) {
            return res.status(403).json({ message: 'Forbidden: Only the file owner can generate a share link.' });
        }

        let token = file.shareLinkToken;
        let expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

        if (!token || (file.shareLinkExpiresAt && file.shareLinkExpiresAt < new Date())) {
            token = uuidv4();
        }

        file.shareLinkToken = token;
        file.shareLinkExpiresAt = expiresAt; // Update expiry
        await file.save();

        const shareUrl = `/share/${token}`;

        res.status(200).json({ 
            message: `Share link generated. Expires on ${expiresAt.toLocaleString()}.`,
            shareLink: shareUrl,
            expiresAt: expiresAt,
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error generating link.', error: error.message });
    }
};

exports.accessSharedFile = async (req, res) => {
    const linkToken = req.params.token;
    const userJwt = req.query.access_token; 

    if (!userJwt) {
        return res.status(401).json({ message: 'Authentication required. No access token provided.' });
    }

    let decoded;
    try {
        decoded = jwt.verify(userJwt.trim(), process.env.JWT_SECRET); // Added trim for safety
        const userId = decoded.id;

        const file = await File.findOne({ shareLinkToken: linkToken });

        if (!file) {
            return res.status(404).json({ message: 'File not found or link is invalid.' });
        }
        
        // checking link expiry
        if (file.shareLinkExpiresAt && file.shareLinkExpiresAt < new Date()) {
            return res.status(403).json({ message: 'Access Denied: The share link has expired.' });
        }

        const isOwner = file.ownerId.equals(userId);

        const authEntry = file.authorizedUsers.find(
            auth => auth.user.equals(userId)
        );

        let isAuthorizedAndNotExpired = false;
        if (authEntry) {
             // If entry exists, check if it has not expired
            if (!authEntry.expiresAt || authEntry.expiresAt > new Date()) {
                isAuthorizedAndNotExpired = true;
            }
        }
        const role = isOwner ? 'Owner' : 'Viewer';
        if (isOwner || isAuthorizedAndNotExpired) {
            // --- AUDIT LOG DOWNLOAD ---
            await logActivity(userId, file._id, 'DOWNLOAD', `Downloaded via Shared Link by ${role}.`);
            // --- END LOG ---

            try {
                // Fetch the file stream from the storage URL
                const response = await axios({
                    method: 'get',
                    url: file.storageUrl,
                    responseType: 'stream' 
                });

                // Set explicit headers to control the download
                res.setHeader('Content-Type', file.fileType);
                res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
                
                // Pipe the file stream directly to the client's response
                response.data.pipe(res);

                // Handle streaming errors
                response.data.on('error', (err) => {
                    console.error('Streaming error during shared link access:', err);
                    if (!res.headersSent) {
                        res.status(500).json({ message: 'Error streaming file content via shared link.' });
                    }
                });
                
                return;

            } catch (downloadError) {
                console.error('Shared file download stream error:', downloadError.message);
                return res.status(500).json({ message: 'Failed to retrieve file from storage URL via shared link.' });
            }
        } else {
            return res.status(403).json({ 
                message: 'Access Denied: Your account is not permitted to view this file, or your access has expired.' 
            });
        }

    } catch (error) {
        console.error('JWT Verification Error:', error.message); 
        return res.status(401).json({ message: 'Authentication failed. Please log in again.' });
    }
};