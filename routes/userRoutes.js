// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ReferralService = require('../services/referralService');
const prisma = require('../db/client');

// GET /api/users/referral-stats - статистика рефералов
router.get('/referral-stats', auth, async (req, res) => {
    try {
        const stats = await ReferralService.getReferralStats(req.user.id);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching referral stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/users/bonus-history - история бонусов
router.get('/bonus-history', auth, async (req, res) => {
    try {
        const history = await prisma.bonusTransaction.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        res.json(history);
    } catch (error) {
        console.error('Error fetching bonus history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;