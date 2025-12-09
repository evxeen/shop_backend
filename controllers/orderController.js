// controllers/orderController.js
const prisma = require('../db/client');

// Создать новый заказ
const createOrder = async (req, res) => {
    try {
        const { customerName, customerPhone, customerEmail, address, items } = req.body;

        // 🔥 ОБНОВЛЕНИЕ: Используем данные пользователя если он авторизован
        const userId = req.user?.id;

        const finalCustomerName = userId ? req.user.name || customerName : customerName;
        const finalCustomerPhone = userId ? req.user.phone || customerPhone : customerPhone;
        const finalCustomerEmail = userId ? req.user.email || customerEmail : customerEmail;

        // Базовая валидация
        if (!finalCustomerName || !finalCustomerPhone || !address || !items || items.length === 0) {
            return res.status(400).json({
                error: 'Missing required fields: customerName, customerPhone, address, items'
            });
        }

        // Рассчитываем общую сумму
        let totalPrice = 0;
        const orderItems = [];

        // Проверяем наличие товаров и рассчитываем сумму
        for (const item of items) {
            const product = await prisma.product.findUnique({
                where: { id: item.productId }
            });

            if (!product) {
                return res.status(404).json({ error: `Product with id ${item.productId} not found` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    error: `Not enough stock for ${product.name}. Available: ${product.stock}`
                });
            }

            const itemTotal = product.price * item.quantity;
            totalPrice += itemTotal;

            orderItems.push({
                productId: item.productId,
                quantity: item.quantity,
                price: product.price // сохраняем цену на момент заказа
            });
        }

        // Создаем заказ в транзакции
        const result = await prisma.$transaction(async (tx) => {
            // 1. Создаем заказ
            const order = await tx.order.create({
                data: {
                    customerName: finalCustomerName,
                    customerPhone: finalCustomerPhone,
                    customerEmail: finalCustomerEmail,
                    address,
                    totalPrice,
                    userId: userId || null, // 🔥 Привязываем к пользователю если есть
                    items: {
                        create: orderItems
                    }
                },
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });



            // 2. Обновляем остатки товаров
            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            decrement: item.quantity
                        }
                    }
                });
            }

            // 🔥 НАЧИСЛЯЕМ БОНУСЫ 5% ПОСЛЕ СОЗДАНИЯ ЗАКАЗА
            if (userId) {
                const loyaltyBonus = totalPrice * 0.05; // 5% от суммы заказа

                // Обновляем баланс пользователя
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        bonusBalance: { increment: loyaltyBonus },
                        totalSpent: { increment: totalPrice },
                        ordersCount: { increment: 1 }
                    }
                });

                // Записываем в историю бонусов
                await tx.bonusTransaction.create({
                    data: {
                        userId: userId,
                        amount: loyaltyBonus,
                        type: 'loyalty_5percent',
                        orderId: order.id,
                        description: `Начислено 5% бонусов с заказа #${order.id}`
                    }
                });

                console.log(`Начислено ${loyaltyBonus} бонусов пользователю ${userId}`);
            }

            return order;
        });

        res.status(201).json({
            message: 'Order created successfully',
            order: result
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Получить все заказы (для админки)
const getAllOrders = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
                user: {
                    select: {
                        email: true,
                        phone: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 🔥 НОВЫЙ МЕТОД: Получить заказы текущего пользователя
const getUserOrders = async (req, res) => {
    try {
        const userId = req.user.id;

        const orders = await prisma.order.findMany({
            where: {
                userId: userId
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(orders);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Обновить статус заказа
const updateOrderStatus = async (req, res) => {
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
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (status === 'delivered') {
            const ReferralService = require('../services/referralService');

            // Начисляем реферальный бонус если заказ выполнен
            await ReferralService.awardReferralBonus(order.userId);
        }

        res.json({
            message: 'Order status updated successfully',
            order
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Order not found' });
        }
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    createOrder,
    getAllOrders,
    getUserOrders, // 🔥 Экспортируем новый метод
    updateOrderStatus
};