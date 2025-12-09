// middleware/adminAuth.js
const { verifyToken } = require('../utils/jwt');
const prisma = require('../db/client');

const adminAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = verifyToken(token);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                telegramId: true,
                username: true,
                role: true
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid token.' });
        }

        if (user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required.' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token.' });
    }
};

module.exports = adminAuth;