// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const {
    createOrder,
    getAllOrders,
    getUserOrders, // 🔥 Импортируем новый метод
    updateOrderStatus
} = require('../controllers/orderController');
const {
    validateCreateOrder,
    validateOrderStatus
} = require('../middleware/validation');
const { auth } = require('../middleware/auth');

// POST /api/orders - создать заказ (с валидацией)
router.post('/', validateCreateOrder, (req, res, next) => {
    // Пытаемся аутентифицировать, но не блокируем если нет токена
    if (req.headers.authorization) {
        auth(req, res, next);
    } else {
        next();
    }
}, createOrder);

// GET /api/orders - все заказы (для админки) - ТОЛЬКО для авторизованных
router.get('/', auth, getAllOrders);

// 🔥 НОВЫЙ РОУТ: GET /api/orders/my - заказы текущего пользователя
router.get('/my', auth, getUserOrders);

// PATCH /api/orders/:id/status - обновить статус заказа (с валидацией)
router.patch('/:id/status', validateOrderStatus, updateOrderStatus);

module.exports = router;