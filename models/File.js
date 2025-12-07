const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const FileSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true,
    },
    fileType: {
        type: String,
        required: true,
    },
    fileSize:{
        type: Number,
        required: true,
    },
    storageUrl: {
        type: String,
        required: true,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    authorizedUsers: [{
        user: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        },
        expiresAt: { 
            type: Date, 
            default: null 
        }
    }],
    shareLinkToken: {
        type: String,
        unique: true,
        sparse: true,
    },
    shareLinkExpiresAt: { 
        type: Date,
        default: null,
    },
}, { timestamps: true });

module.exports = mongoose.model('File', FileSchema);