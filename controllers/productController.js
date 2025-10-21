// controllers/productController.js
const prisma = require('../db/client');

// Получить все товары с фильтрацией
const getAllProducts = async (req, res) => {
    try {
        const { category, minPrice, maxPrice, inStock } = req.query;

        const where = {
            isActive: true
        };

        // Фильтр по категории
        if (category) {
            where.category = {
                contains: category,
                mode: 'insensitive'
            };
        }

        // Фильтр по цене
        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price.gte = parseFloat(minPrice);
            if (maxPrice) where.price.lte = parseFloat(maxPrice);
        }

        // Фильтр по наличию
        if (inStock === 'true') {
            where.stock = {
                gt: 0
            };
        }

        const products = await prisma.product.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({
            data: products,
            meta: {
                total: products.length,
                filters: {
                    category,
                    minPrice,
                    maxPrice,
                    inStock
                }
            }
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Получить товар по ID
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) }
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (!product.isActive) {
            return res.status(404).json({ error: 'Product is not available' });
        }

        res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllProducts,
    getProductById
};