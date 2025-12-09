const express = require('express');
const cors = require('cors');
require('dotenv').config();

const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const errorHandler = require('./middleware/errorHandler');


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes); // ← И ЭТОЙ ТОЖЕ!
app.use('/api/admin', adminRoutes);


// Test route
app.get('/', (req, res) => {
    res.json({
        message: 'Vape Shop API is running!',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                me: 'GET /api/auth/me'
            },
            products: {
                getAll: 'GET /api/products',
                getById: 'GET /api/products/:id'
            },
            orders: {
                create: 'POST /api/orders',
                getAll: 'GET /api/orders',
                updateStatus: 'PATCH /api/orders/:id/status'
            }
        }
    });
});

// ... остальной код
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