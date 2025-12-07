
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
        // For this assignment, we allow most common types:
        if (file.originalname.match(/\.(pdf|jpe?g|png|gif|docx?|xlsx?|csv|txt)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type.'), false);
        }
    },
});


module.exports = {
    cloudinary,
    fileUploader
};