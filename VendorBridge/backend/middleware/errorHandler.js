const errorHandler = (err, req, res, next) => {
    console.error('Unhandled Error:', err);
    
    // Check if it's a known error structure or just use a generic message
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        message: statusCode === 500 && process.env.NODE_ENV === 'production' 
                 ? 'An unexpected error occurred' 
                 : message
    });
};

module.exports = errorHandler;
