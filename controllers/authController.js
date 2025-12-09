// controllers/authController.js
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');
const prisma = require('../db/client');

// Генерация реферального кода
const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Регистрация
const register = async (req, res) => {
    try {
        const { email, password, phone, referralCode } = req.body;

        // Валидация
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Проверяем существует ли пользователь
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Хэшируем пароль
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Обрабатываем реферальный код если есть
        let referrerId = null;
        if (referralCode) {
            const referrer = await prisma.user.findUnique({
                where: { referralCode }
            });
            if (referrer) {
                referrerId = referrer.id;
            }
        }

        // Создаем пользователя
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                phone,
                referralCode: generateReferralCode(),
                referrerId
            },
            select: {
                id: true,
                email: true,
                phone: true,
                role: true,
                bonusBalance: true,
                referralCode: true,
                createdAt: true
            }
        });

        // Генерируем токен
        const token = generateToken(user.id);

        res.status(201).json({
            message: 'User registered successfully',
            user,
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Логин
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Находим пользователя
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                passwordHash: true,
                phone: true,
                role: true,
                bonusBalance: true,
                referralCode: true
            }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Проверяем пароль
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Убираем passwordHash из ответа
        const { passwordHash, ...userWithoutPassword } = user;

        // Генерируем токен
        const token = generateToken(user.id);

        res.json({
            message: 'Login successful',
            user: userWithoutPassword,
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Получить текущего пользователя
const getMe = async (req, res) => {
    try {
        res.json({ user: req.user });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    register,
    login,
    getMe
};