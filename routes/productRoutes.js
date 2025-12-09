// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const { getAllProducts, getProductById } = require('../controllers/productController');

// GET /api/products - все товары
router.get('/', getAllProducts);

// GET /api/products/:id - товар по ID
router.get('/:id', getProductById);

module.exports = router;