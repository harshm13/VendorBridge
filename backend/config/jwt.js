/**
 * VendorBridge Global — JWT Security Configuration (backend/config/jwt.js)
 * Ensures JWT secrets are strictly sourced from environment variables with no insecure production fallbacks.
 */

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing or empty in production mode.');
        }
        if (process.env.NODE_ENV === 'test') {
            return 'ephemeral-test-jwt-secret-vendorbridge-2026';
        }
        throw new Error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing. Define JWT_SECRET in .env.');
    }
    return secret.trim();
}

module.exports = {
    getJwtSecret
};
