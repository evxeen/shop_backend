// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const prisma = require('../db/client');

// 🔥 СТАТИСТИКА ДЛЯ ДАШБОРДА
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const [
            totalOrders,
            totalUsers,
            totalProducts,
            totalRevenue,
            recentOrders,
            popularProducts
        ] = await Promise.all([
            // Общее количество заказов
            prisma.order.count(),

            // Общее количество пользователей
            prisma.user.count(),

            // Общее количество товаров
            prisma.product.count(),

            // Общая выручка
            prisma.order.aggregate({
                _sum: {
                    totalPrice: true
                }
            }),

            // Последние 5 заказов
            prisma.order.findMany({
                take: 5,
                include: {
                    user: {
                        select: {
                            telegramId: true,
                            username: true
                        }
                    },
                    items: {
                        include: {
                            product: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),

            // Популярные товары
            prisma.orderItem.groupBy({
                by: ['productId'],
                _sum: {
                    quantity: true
                },
                orderBy: {
                    _sum: {
                        quantity: 'desc'
                    }
                },
                take: 5
            })
        ]);

        // Получаем информацию о товарах для популярных
        const popularProductsWithInfo = await Promise.all(
            popularProducts.map(async (item) => {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId }
                });
                return {
                    ...product,
                    totalSold: item._sum.quantity
                };
            })
        );

        res.json({
            stats: {
                totalOrders,
                totalUsers,
                totalProducts,
                totalRevenue: totalRevenue._sum.totalPrice || 0
            },
            recentOrders,
            popularProducts: popularProductsWithInfo
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 🔥 ВСЕ ЗАКАЗЫ С ФИЛЬТРАМИ
router.get('/orders', adminAuth, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const where = {};
        if (status && status !== 'all') {
            where.status = status;
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                user: {
                    select: {
                        telegramId: true,
                        username: true
                    }
                },
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip: (page - 1) * limit,
            take: parseInt(limit)
        });

        const total = await prisma.order.count({ where });

        res.json({
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Admin orders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 🔥 ОБНОВЛЕНИЕ СТАТУСА ЗАКАЗА
router.patch('/orders/:id/status', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                validStatuses
            });
        }

        const order = await prisma.order.update({
            where: { id: parseInt(id) },
            data: { status },
            include: {
                user: {
                    select: {
                        telegramId: true,
                        username: true
                    }
                },
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        res.json({
            message: 'Order status updated successfully',
            order
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Order not found' });
        }
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 🔥 ВСЕ ПОЛЬЗОВАТЕЛИ
router.get('/users', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const users = await prisma.user.findMany({
            select: {
                id: true,
                telegramId: true,
                username: true,
                role: true,
                bonusBalance: true,
                totalSpent: true,
                ordersCount: true,
                referralCode: true,
                createdAt: true,
                referrals: {
                    select: {
                        id: true,
                        telegramId: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip: (page - 1) * limit,
            take: parseInt(limit)
        });

        const total = await prisma.user.count();

        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 🔥 УПРАВЛЕНИЕ ТОВАРАМИ
router.get('/products', adminAuth, async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(products);
    } catch (error) {
        console.error('Admin products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 🔥 СОЗДАНИЕ/ОБНОВЛЕНИЕ ТОВАРА
router.post('/products', adminAuth, async (req, res) => {
    try {
        const { name, description, price, stock, category, imageUrl } = req.body;

        const product = await prisma.product.create({
            data: {
                name,
                description,
                price: parseFloat(price),
                stock: parseInt(stock),
                category,
                imageUrl
            }
        });

        res.json({
            message: 'Product created successfully',
            product
        });
    } catch (error) {
        console.error('Admin product creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 🔥 ОБНОВЛЕНИЕ ТОВАРА
router.put('/products/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, stock, category, imageUrl, isActive } = req.body;

        const product = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                price: price ? parseFloat(price) : undefined,
                stock: stock ? parseInt(stock) : undefined,
                category,
                imageUrl,
                isActive
            }
        });

        res.json({
            message: 'Product updated successfully',
            product
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Product not found' });
        }
        console.error('Admin product update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;