const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';

    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Invalid or expired token.';
    } else if (err.name === 'ValidationError') {
        statusCode = 400;
    } else if (err.code === 'ER_DUP_ENTRY') {
        statusCode = 409;
        message = 'A resource with this identifier already exists.';
    }

    if (statusCode >= 500) {
        console.error('Unhandled Error:', err);
    }

    res.status(statusCode).json({
        success: false,
        message: statusCode === 500 && process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : message
    });
};

module.exports = errorHandler;
