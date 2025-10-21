// middleware/validation.js

// Валидация создания заказа
const validateCreateOrder = (req, res, next) => {
    const { customerName, customerPhone, address, items } = req.body;

    const errors = [];

    if (!customerName || customerName.trim().length < 2) {
        errors.push('Customer name is required and must be at least 2 characters long');
    }

    if (!customerPhone || !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(customerPhone)) {
        errors.push('Valid phone number is required');
    }

    if (!address || address.trim().length < 10) {
        errors.push('Address is required and must be at least 10 characters long');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        errors.push('Items array is required and must not be empty');
    } else {
        items.forEach((item, index) => {
            if (!item.productId || item.productId <= 0) {
                errors.push(`Item ${index + 1}: valid productId is required`);
            }
            if (!item.quantity || item.quantity <= 0) {
                errors.push(`Item ${index + 1}: quantity must be at least 1`);
            }
        });
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

// Валидация обновления статуса заказа
const validateOrderStatus = (req, res, next) => {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            error: 'Invalid status',
            validStatuses
        });
    }

    next();
};

module.exports = {
    validateCreateOrder,
    validateOrderStatus
};