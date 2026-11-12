const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

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
