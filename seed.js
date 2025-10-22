const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    const products = await prisma.product.createMany({
        data: [
            {
                name: 'Жидкость "Табачный классик"',
                description: 'Классический табачный вкус, крепость 3mg',
                price: 450,
                stock: 15,
                category: 'Жидкости',
                imageUrl: null
            },
            {
                name: 'Жидкость "Мятная свежесть"',
                description: 'Освежающий мятный вкус, крепость 6mg',
                price: 480,
                stock: 10,
                category: 'Жидкости',
                imageUrl: null
            },
            {
                name: 'Испаритель PnP-VM6',
                description: 'Сменный испаритель для Voopoo Drag系列',
                price: 320,
                stock: 25,
                category: 'Расходники',
                imageUrl: null
            }
        ]
    });

    console.log(`✅ Created ${products.count} products`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });