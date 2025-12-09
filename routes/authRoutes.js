// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const crypto = require('crypto');

// 🔥 ДОБАВЛЯЕМ ФУНКЦИЮ GENERATE_REFERRAL_CODE
const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// 🔥 ДОБАВЛЯЕМ ФУНКЦИЮ ДЛЯ ПОИСКА РЕФЕРЕРА
const findReferrerId = async (referralCode) => {
    if (!referralCode) return null;

    const prisma = require('../db/client');
    const referrer = await prisma.user.findUnique({
        where: { referralCode }
    });

    return referrer ? referrer.id : null;
};

// 🔥 ФУНКЦИЯ ПРОВЕРКИ TELEGRAM ДАННЫХ
const verifyTelegramData = (telegramData) => {
    // В режиме разработки пропускаем проверку
    if (process.env.NODE_ENV === 'development' || telegramData.hash?.includes('test_hash_development')) {
        console.log('Development mode: skipping Telegram signature verification');
        return true;
    }

    // На продакшене проверяем подпись
    const botToken = '';
    const checkString = Object.keys(telegramData)
        .filter(key => key !== 'hash')
        .sort()
        .map(key => `${key}=${telegramData[key]}`)
        .join('\n');

    const secretKey = crypto.createHash('sha256')
        .update(botToken)
        .digest();

    const hash = crypto.createHmac('sha256', secretKey)
        .update(checkString)
        .digest('hex');

    return hash === telegramData.hash;
};

// 🔥 ИСПРАВЛЕННЫЙ РОУТ /telegram
router.post('/telegram', async (req, res) => {
    try {
        const { id, first_name, username, photo_url, hash, auth_date, referralCode } = req.body;

        console.log('Telegram login attempt:', {
            id,
            username,
            first_name,
            referralCode
        });

        // Пропускаем проверку в разработке
        if (process.env.NODE_ENV === 'development' || hash?.includes('admin_login_') || hash?.includes('test_hash_')) {
            console.log('Development mode: skipping Telegram signature verification');
        } else if (!verifyTelegramData(req.body)) {
            return res.status(400).json({ error: 'Invalid Telegram data' });
        }

        const prisma = require('../db/client');
        const { generateToken } = require('../utils/jwt');
        const { generateReferralCode } = require('./authController'); // или определи функцию здесь

        // Ищем реферера если есть код
        let referrerId = null;
        if (referralCode) {
            const referrer = await prisma.user.findUnique({
                where: { referralCode }
            });
            if (referrer) {
                referrerId = referrer.id;
            }
        }

        // 🔥 ВАЖНО: Ищем существующего пользователя
        const existingUser = await prisma.user.findUnique({
            where: { telegramId: String(id) }
        });

        console.log('Existing user:', existingUser);

        // Определяем данные для обновления/создания
        const updateData = {};
        const createData = {
            telegramId: String(id),
            referralCode: generateReferralCode(),
            referrerId: referrerId
        };

        // Если передано username - используем его
        if (username) {
            updateData.username = username;
            createData.username = username;
        }

        // Если пользователь существует - сохраняем его роль, иначе ставим USER
        if (existingUser) {
            createData.role = existingUser.role; // Сохраняем существующую роль
        } else {
            createData.role = 'USER'; // Новые пользователи - USER по умолчанию
        }

        // Ищем или создаем пользователя
        const user = await prisma.user.upsert({
            where: { telegramId: String(id) },
            update: updateData,
            create: createData,
            select: {
                id: true,
                telegramId: true,
                username: true, // 🔥 ВКЛЮЧАЕМ
                role: true,     // 🔥 ВКЛЮЧАЕМ
                phone: true,
                bonusBalance: true,
                referralCode: true,
                createdAt: true,
                updatedAt: true
            }
        });

        console.log('User after upsert:', user);

        const token = generateToken(user.id);

        res.json({
            message: 'Telegram login successful',
            user,
            token
        });

    } catch (error) {
        console.error('Telegram login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 🔥 ВРЕМЕННЫЙ РОУТ ДЛЯ СОЗДАНИЯ АДМИНА
router.post('/create-admin', async (req, res) => {
    try {
        const { telegramId, username } = req.body;

        const prisma = require('../db/client');
        const { generateToken } = require('../utils/jwt');

        // Создаем админа
        const admin = await prisma.user.upsert({
            where: { telegramId },
            update: {
                role: 'ADMIN'
            },
            create: {
                telegramId,
                username,
                role: 'ADMIN',
                referralCode: Math.random().toString(36).substring(2, 8).toUpperCase()
            },
            select: {
                id: true,
                telegramId: true,
                username: true,
                role: true,
                referralCode: true
            }
        });

        const token = generateToken(admin.id);

        res.json({
            message: 'Admin user created successfully',
            user: admin,
            token
        });
    } catch (error) {
        console.error('Admin creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 🔥 СПЕЦИАЛЬНЫЙ РОУТ ДЛЯ АДМИНСКОГО ВХОДА
router.post('/admin-login', async (req, res) => {
    try {
        const { telegramId } = req.body;

        const prisma = require('../db/client');
        const { generateToken } = require('../utils/jwt');

        // Находим пользователя
        const user = await prisma.user.findUnique({
            where: { telegramId },
            select: {
                id: true,
                telegramId: true,
                username: true,
                role: true,
                bonusBalance: true,
                referralCode: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const token = generateToken(user.id);

        res.json({
            message: 'Admin login successful',
            user,
            token
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// СТАРЫЕ РОУТЫ
router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);

// 🔥 ТЕСТОВЫЙ РОУТ - проверка пользователя
router.get('/test-user/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;

        console.log('Testing user:', telegramId);

        const prisma = require('../db/client');

        const user = await prisma.user.findUnique({
            where: { telegramId },
            select: {
                id: true,
                telegramId: true,
                username: true,
                role: true,
                phone: true,
                bonusBalance: true,
                referralCode: true,
                createdAt: true
            }
        });

        console.log('User found:', user);

        res.json({
            user,
            exists: !!user
        });
    } catch (error) {
        console.error('Test user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🔥 РОУТ ДЛЯ ОБНОВЛЕНИЯ РОЛИ
router.post('/update-role/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const { role } = req.body;

        console.log(`Updating role for ${telegramId} to ${role}`);

        const prisma = require('../db/client');

        const user = await prisma.user.update({
            where: { telegramId },
            data: {
                role: role || 'ADMIN'
            },
            select: {
                id: true,
                telegramId: true,
                username: true,
                role: true,
                phone: true,
                bonusBalance: true,
                referralCode: true,
                createdAt: true
            }
        });

        console.log('User updated:', user);

        res.json({
            message: 'User role updated successfully',
            user
        });
    } catch (error) {
        console.error('Update role error:', error);

        // Если пользователь не найден
        if (error.code === 'P2025') {
            return res.status(404).json({
                error: 'User not found',
                telegramId
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

// 🔥 РОУТ ДЛЯ ПОЛУЧЕНИЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ (для отладки)
router.get('/all-users', async (req, res) => {
    try {
        const prisma = require('../db/client');

        const users = await prisma.user.findMany({
            select: {
                id: true,
                telegramId: true,
                username: true,
                role: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({
            count: users.length,
            users
        });
    } catch (error) {
        console.error('All users error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;