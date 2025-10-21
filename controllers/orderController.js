const prisma = require('../db/client');

// Создать новый заказ
const createOrder = async (req, res) => {
    try {
        const { customerName, customerPhone, customerEmail, address, items } = req.body;

        // Базовая валидация
        if (!customerName || !customerPhone || !address || !items || items.length === 0) {
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
                    customerName,
                    customerPhone,
                    customerEmail,
                    address,
                    totalPrice,
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
    updateOrderStatus
};