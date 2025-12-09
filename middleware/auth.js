// middleware/auth.js
const { verifyToken } = require('../utils/jwt');
const prisma = require('../db/client');

const auth = async (req, res, next) => {
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
                email: true,
                phone: true,
                role: true,
                bonusBalance: true,
                referralCode: true
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid token.' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token.' });
    }
};

const adminAuth = async (req, res, next) => {
    try {
        await auth(req, res, () => {
            if (req.user.role !== 'ADMIN') {
                return res.status(403).json({ error: 'Admin access required.' });
            }
            next();
        });
    } catch (error) {
        res.status(401).json({ error: 'Authentication failed.' });
    }
};

module.exports = {
    auth,
    adminAuth
};