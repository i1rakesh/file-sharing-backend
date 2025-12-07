
const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({

    filename: {
        type: String,
        required: true,
    },
    fileType: {
        type: String,
        required: true,
    },
    fileSize: { 
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],

    shareLinkToken: {
        type: String,
        unique: true,
        sparse: true, 
    },

    expiryDate: {
        type: Date,
        default: null,
    },

}, {
    timestamps: true 
});

module.exports = mongoose.model('File', FileSchema);
 