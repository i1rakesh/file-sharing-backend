// utils/audit.js
const fs = require('fs').promises; // Use the promises API for async/await
const path = require('path');

// Define the absolute path for the log file (placed in the root of the backend folder)
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
            userId: userId.toString(), // Store as string
            fileId: fileId.toString(),
            action,
            details,
        };
        
        // Convert the log object to a JSON string and append a newline
        const logString = JSON.stringify(logEntry) + '\n';

        // Use appendFile to write the log entry without overwriting previous logs
        await fs.appendFile(LOG_FILE, logString, 'utf8');

    } catch (error) {
        // Log the error but do not crash the main application process
        console.error('Error recording audit log to file:', error.message);
    }
};