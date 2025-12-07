
const express = require('express');
const { protect } = require('../middleware/authMiddleware'); 
const { fileUploader } = require('../config/cloudinary');
const { 
    uploadFiles, 
    getFiles, 
    downloadFile,
    shareFileWithUsers,
    generateShareLink,
    accessSharedFile
} = require('../controllers/fileController'); 

const router = express.Router();

// 1. UPLOAD ROUTE 
router.post(
    '/upload',
    protect, // Must be logged in
    fileUploader.array('files', 10), // Allow up to 10 files (bulk upload)
    uploadFiles
);

// 2. GET USER FILES
router.get('/my-files', protect, getFiles);

// 3. DOWNLOAD FILE
router.get('/:id/download', protect, downloadFile);

// 4. SHARING API 
router.post('/:id/share/user', protect, shareFileWithUsers);
router.post('/:id/share/link', protect, generateShareLink);

// 5. PUBLIC LINK ACCESS 
router.get('/access/:token', accessSharedFile);

module.exports = router;