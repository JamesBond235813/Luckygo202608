/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            keyframes: {
                'home-notice-marquee': {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
            },
            animation: {
                'home-notice-marquee': 'home-notice-marquee 14s linear infinite',
            },
            colors: {
                primary: '#FFD700', // Gold
                'ghana-red': '#CE1126',
                'ghana-yellow': '#FCD116',
                'ghana-green': '#006B3F',
                surface: '#F8F9FA',
                'dark-surface': '#0F172A',
                'dark-card': '#111827',
            }
        },
    },
    plugins: [],
}
