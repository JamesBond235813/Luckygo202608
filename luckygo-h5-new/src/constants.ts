/** 单次参与夺宝的最低消费金额（GHS） */
export const MIN_PARTICIPATION_GHS = 5;

/** 每 100 金豆可兑换的夺宝专用余额（GHS），与最低参与金额无关 */
export const BEANS_EXCHANGE_GHS_PER_100 = 1;

export interface Review {
    id: string;
    userName: string;
    userAvatar: string;
    rating: number;
    comment: string;
    date: string;
    images?: string[];
}

export const HOT_PICKS = [
    {
        id: '1',
        title: 'Apple iPhone 15 Pro Max 256GB - Natural Titanium',
        description: 'The ultimate iPhone with titanium design, A17 Pro chip, and the most powerful camera system ever.',
        image: 'https://img.freepik.com/free-photo/smartphone-balancing-with-pink-background_23-2150271746.jpg?uid=R26639641&ga=GA1.1.1311241164.1721094073',
        totalPrice: 15999,
        pricePerShare: 5.0,
        totalShares: 15999,
        sharesSold: 12450,
        tag: 'Hot Selling',
        status: 'Running'
    },
    {
        id: '2',
        title: 'Sony PlayStation 5 Slim Console (Disc Edition)',
        description: 'Play Has No Limits. Experience lightning-fast loading and deeper immersion with haptic feedback.',
        image: 'https://img.freepik.com/free-photo/controller-gamepad-front-view-disposable-cups_23-2148293708.jpg?uid=R26639641&ga=GA1.1.1311241164.1721094073',
        totalPrice: 4200,
        pricePerShare: 5.0,
        totalShares: 4200,
        sharesSold: 890,
        tag: 'Limited Time',
        status: 'Running'
    },
    {
        id: '3',
        title: 'MacBook Air 15-inch M3 Chip 8GB/256GB',
        description: 'Strikingly thin and fast so you can work, play, or create anywhere.',
        image: 'https://img.freepik.com/free-photo/laptop-balancing-with-purple-background_23-2150271750.jpg?uid=R26639641&ga=GA1.1.1311241164.1721094073',
        totalPrice: 12999,
        pricePerShare: 2.0,
        totalShares: 6500,
        sharesSold: 120,
        status: 'Running'
    }
];

export const TRENDING = [
    {
        id: '4',
        title: 'Samsung Galaxy S24 Ultra 512GB',
        description: 'Galaxy AI is here. Epic surfing, searching, and creating with the most powerful Galaxy.',
        image: 'https://img.freepik.com/free-photo/smartphone-with-gradient-background_23-2150271816.jpg?uid=R26639641&ga=GA1.1.1311241164.1721094073',
        totalPrice: 11999,
        pricePerShare: 5.0,
        totalShares: 11999,
        sharesSold: 4500,
        status: 'Running'
    },
    {
        id: '5',
        title: 'Dyson V15 Detect Absolute Vacuum',
        description: 'Powerful, intelligent cordless vacuum. Reveals microscopic dust.',
        image: 'https://img.freepik.com/free-photo/electric-vacuum-cleaner-isolated-white-background_1232-2311.jpg?uid=R26639641&ga=GA1.1.1311241164.1721094073',
        totalPrice: 5999,
        pricePerShare: 5.0,
        totalShares: 5999,
        sharesSold: 200,
        status: 'Running'
    },
    {
        id: '6',
        title: 'AirPods Pro (2nd Generation)',
        description: 'Rich, immersive sound. Next-level Active Noise Cancellation.',
        image: 'https://img.freepik.com/free-photo/wireless-earbuds-case_23-2150271790.jpg?uid=R26639641&ga=GA1.1.1311241164.1721094073',
        totalPrice: 1899,
        pricePerShare: 5.0,
        totalShares: 1899,
        sharesSold: 1200,
        status: 'Running'
    }
];

export const HISTORY_RECORDS = [
    {
        id: '1',
        productName: 'Apple iPhone 15 Pro Max',
        productImage: 'https://img.freepik.com/free-photo/smartphone-balancing-with-pink-background_23-2150271746.jpg?uid=R26639641&ga=GA1.1.1311241164.1721094073',
        issue: '20240901001',
        drawTime: '2024-09-01 14:30:00',
        winningNumber: '10002345',
        totalShares: 15999,
        winnerName: 'Kofi Mensah',
        winnerAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d',
        winnerLocation: 'Accra, GH',
        valueA: '123456789012',
        valueB: '15999'
    },
    {
        id: '2',
        productName: 'Sony PlayStation 5 Slim',
        productImage: 'https://img.freepik.com/free-photo/controller-gamepad-front-view-disposable-cups_23-2148293708.jpg?uid=R26639641&ga=GA1.1.1311241164.1721094073',
        issue: '20240901002',
        drawTime: '2024-09-01 12:15:00',
        winningNumber: '10000888',
        totalShares: 4200,
        winnerName: 'Ama Osei',
        winnerAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
        winnerLocation: 'Kumasi, GH',
        valueA: '987654321098',
        valueB: '4200'
    }
];

export const WINNING_RECORDS = [
    {
        id: '1',
        product: {
            title: 'iPad Air 5th Gen 64GB',
            image: 'https://img.freepik.com/free-photo/tablet-screen-mockup-digital-device_53876-96378.jpg?uid=R26639641&ga=GA1.1.1311241164.1721094073'
        },
        issue: '20240830088',
        winningNumber: '10005678',
        status: 'Processing',
        timestamp: '2024-08-30 18:20'
    },
    {
        id: '2',
        product: {
            title: 'JBL Flip 6 Portable Speaker',
            image: 'https://img.freepik.com/free-photo/wireless-speaker-orange-background_23-2150271830.jpg?uid=R26639641&ga=GA1.1.1311241164.1721094073'
        },
        issue: '20240825012',
        winningNumber: '10001122',
        status: 'Received',
        timestamp: '2024-08-25 10:05'
    }
];

export const TRANSACTIONS = [
    { id: 'tx1', type: 'Recharge', amount: 500.00, timestamp: 'Today 14:30', status: 'Success', method: 'Online' },
    { id: 'tx2', type: 'Spend', amount: -128.00, timestamp: 'Yesterday 09:15', status: 'Success' },
    { id: 'tx3', type: 'Withdraw', amount: -200.00, timestamp: 'Oct 24 18:20', status: 'Processing' },
    { id: 'tx4', type: 'Reward', amount: 10.00, timestamp: 'Oct 20 10:00', status: 'Success' }
];

export const MOCK_USER = {
    id: '888888',
    nickname: 'LuckyStar_GH',
    avatar: 'https://i.pravatar.cc/150?u=a04258114e29026702d',
    balance: 150.00,
    beans: 2450,
    vipLevel: 2
};
