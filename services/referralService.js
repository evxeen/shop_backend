// services/referralService.js
const prisma = require('../db/client');

class ReferralService {
    // Начисление бонуса за приглашенного друга
    static async awardReferralBonus(referredUserId) {
        try {
            const referredUser = await prisma.user.findUnique({
                where: { id: referredUserId },
                include: { referrer: true }
            });

            if (!referredUser || !referredUser.referrerId) {
                return; // Нет реферера
            }

            const referrer = referredUser.referrer;
            const referralBonus = 5; // 5 рублей за каждого друга

            // Обновляем баланс пригласившего
            await prisma.user.update({
                where: { id: referrer.id },
                data: {
                    bonusBalance: { increment: referralBonus }
                }
            });

            // Записываем в историю бонусов
            await prisma.bonusTransaction.create({
                data: {
                    userId: referrer.id,
                    amount: referralBonus,
                    type: 'referral_bonus',
                    description: `Бонус за приглашенного друга (ID: ${referredUserId})`
                }
            });

            console.log(`Начислено ${referralBonus} руб рефереру ${referrer.id}`);

        } catch (error) {
            console.error('Error awarding referral bonus:', error);
        }
    }

    // Получение статистики по рефералам
    static async getReferralStats(userId) {
        const referrals = await prisma.user.findMany({
            where: { referrerId: userId },
            select: {
                id: true,
                telegramId: true,
                username: true,
                createdAt: true,
                orders: {
                    select: {
                        id: true,
                        totalPrice: true,
                        status: true
                    }
                }
            }
        });

        const completedReferrals = referrals.filter(ref =>
            ref.orders.some(order => order.status === 'delivered')
        );

        return {
            totalReferrals: referrals.length,
            completedReferrals: completedReferrals.length,
            pendingBonus: completedReferrals.length * 5,
            referrals: referrals.map(ref => ({
                ...ref,
                hasCompletedOrder: ref.orders.some(order => order.status === 'delivered')
            }))
        };
    }
}

module.exports = ReferralService;