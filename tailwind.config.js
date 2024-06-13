/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: [
        './index.html',
        './src/**/*.{vue,js,ts,jsx,tsx}',
        './lib/**/*.{vue,js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {},
    },
    plugins: [require('daisyui')],
    daisyui: {
        themes: [
            {
                light: {
                    ...require('daisyui/src/theming/themes')[
                        '[data-theme=light]'
                    ],
                    primary: '#666cff',
                },
            },
            {
                dark: {
                    ...require('daisyui/src/theming/themes')[
                        '[data-theme=dark]'
                    ],
                    primary: '#666cff',
                    'base-100': '#2a334c',
                },
            },
        ],
    },
};
