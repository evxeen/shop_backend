// middleware/errorHandler.js

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Prisma errors
    if (err.code === 'P2002') {
        return res.status(400).json({
            error: 'Duplicate field value',
            details: 'A record with this value already exists'
        });
    }

    if (err.code === 'P2025') {
        return res.status(404).json({
            error: 'Record not found',
            details: 'The requested record was not found'
        });
    }

    if (err.code === 'P2003') {
        return res.status(400).json({
            error: 'Foreign key constraint failed',
            details: 'Invalid reference to related record'
        });
    }

    // Default error
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
};

module.exports = errorHandler;