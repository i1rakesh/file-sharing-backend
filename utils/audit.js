
const fs = require('fs').promises; 
const path = require('path');


const LOG_FILE = path.join(__dirname, '..', 'audit.log');

/**
 * Records an activity into the Audit Log file.
 * @param {string} userId - ID of the user performing the action.
 * @param {string} fileId - ID of the affected file.
 * @param {string} action - Type of action (e.g., 'DOWNLOAD').
 * @param {string} details - Additional context/data.
 */
exports.logActivity = async (userId, fileId, action, details = null) => {
    try {
        const logEntry = {
            timestamp: new Date().toISOString(),
            userId: userId.toString(), 
            fileId: fileId.toString(),
            action,
            details,
        };
        
        
        const logString = JSON.stringify(logEntry) + '\n';

        
        await fs.appendFile(LOG_FILE, logString, 'utf8');

    } catch (error) {
        console.error('Error recording audit log to file:', error.message);
    }
};