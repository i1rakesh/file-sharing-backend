
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config(); 


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {

        return {
            folder: 'fullstack-assignment-files', 
            resource_type: 'auto', 
            
        };
    },
});


const fileUploader = multer({
    storage: storage,
    limits: {
        
        fileSize: 50 * 1024 * 1024
    },
 
    fileFilter: (req, file, cb) => {
        // Enforce file type validation on the server
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'application/pdf', 
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'application/vnd.ms-excel', 
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only photos, PDF, Word, Excel, and CSV files are allowed."), false);
        }
    }
});


module.exports = {
    cloudinary,
    fileUploader
};