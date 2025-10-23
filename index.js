// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://shop-frontend-self.vercel.app', // твой фронтенд на Vercel
        'https://*.vercel.app' // все поддомены Vercel
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
// В секции middleware
// app.use(cors({
//     origin: [
//         'http://localhost:3000',
//         'https://your-frontend-domain.vercel.app' // замени на твой домен Vercel
//     ],
//     credentials: true
// }));
//
// // Или разреши все домены для тестирования:
// app.use(cors({
//     origin: "*", // временно для теста
//     credentials: true
// }));

app.use(express.json());

// Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Test route
app.get('/', (req, res) => {
    res.json({
        message: 'Vape Shop API is running!',
        endpoints: {
            products: {
                getAll: 'GET /api/products',
                getById: 'GET /api/products/:id'
            },
            orders: {
                create: 'POST /api/orders',
                getAll: 'GET /api/orders',
                updateStatus: 'PATCH /api/orders/:id/status'
            }
        },
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});

// Error handler (должен быть последним middleware)
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Prisma Studio: npx prisma studio`);
    console.log(`🛍️  API endpoints:`);
    console.log(`   Products: http://localhost:${PORT}/api/products`);
    console.log(`   Orders:   http://localhost:${PORT}/api/orders`);
    console.log(`   Health:   http://localhost:${PORT}/health`);
});