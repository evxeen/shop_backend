// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const {
    createOrder,
    getAllOrders,
    updateOrderStatus
} = require('../controllers/orderController');
const {
    validateCreateOrder,
    validateOrderStatus
} = require('../middleware/validation');

// POST /api/orders - создать заказ (с валидацией)
router.post('/', validateCreateOrder, createOrder);

// GET /api/orders - все заказы (для админки)
router.get('/', getAllOrders);

// PATCH /api/orders/:id/status - обновить статус заказа (с валидацией)
router.patch('/:id/status', validateOrderStatus, updateOrderStatus);

module.exports = router;