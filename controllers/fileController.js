
const File = require('../models/File');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');


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
                { authorizedUsers: req.user._id }
            ]
        })
        .select('-shareLinkToken');

        res.status(200).json(files);
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

        const isAuthorized = file.authorizedUsers.some(authId => authId.equals(userId));

        if (isOwner || isAuthorized) {
            return res.redirect(file.storageUrl); 
        } else {
            return res.status(403).json({ message: 'Access Denied: You are not authorized to download this file.' });
        }

    } catch (error) {
        res.status(500).json({ message: 'Server error during download check.', error: error.message });
    }
};


exports.shareFileWithUsers = async (req, res) => {
    const fileId = req.params.id;
    const { targetEmails } = req.body; 
    const ownerId = req.user._id;
    const User = require('../models/User'); 

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(404).json({ message: 'Invalid File ID.' });
    }

    try {
        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).json({ message: 'File not found.' });
        }

        if (!file.ownerId.equals(ownerId)) {
            return res.status(403).json({ message: 'Forbidden: Only the file owner can share this file.' });
        }

        const targetUsers = await User.find({ email: { $in: targetEmails } }).select('_id');
        const targetUserIds = targetUsers.map(u => u._id);

        if (targetUserIds.length === 0) {
            return res.status(404).json({ message: 'No valid users found to share with.' });
        }

        const updatedFile = await File.findByIdAndUpdate(
            fileId,
            { $addToSet: { authorizedUsers: { $each: targetUserIds } } },
            { new: true }
        );
        
        
        res.status(200).json({ 
            message: `${targetUserIds.length} users successfully granted access.`,
            file: updatedFile
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error during sharing.', error: error.message });
    }
};

exports.generateShareLink = async (req, res) => {
    const fileId = req.params.id;
    const ownerId = req.user._id;

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

        if (!token) {
            token = uuidv4();
            file.shareLinkToken = token;
            await file.save();
        }

        const shareUrl = `/share/${token}`;

        res.status(200).json({ 
            message: 'Share link generated.',
            shareLink: shareUrl,
            token: token 
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

        decoded = jwt.verify(userJwt, process.env.JWT_SECRET);
        const userId = decoded.id;

        const file = await File.findOne({ shareLinkToken: linkToken });

        if (!file) {
            return res.status(404).json({ message: 'File not found or link is invalid.' });
        }
        
        const isOwner = file.ownerId.equals(userId);
        const isAuthorized = file.authorizedUsers.some(authId => authId.equals(userId));

        if (isOwner || isAuthorized) {
            return res.redirect(file.storageUrl);
        } else {
            return res.status(403).json({ 
                message: 'Access Denied: Your account is not permitted to view this file, even with a valid link.' 
            });
        }

    } catch (error) {

        console.log('JWT Verification Error:', error); 
        return res.status(401).json({ message: 'Authentication failed. Please log in again.' });
    }
};