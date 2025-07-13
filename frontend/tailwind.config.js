// tailwind.config.js

module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Light Theme (Attmosfire style)
        lightBg: '#f5f7fb',
        lightSidebar: '#ffffff',
        lightText: '#2e2e2e',
        lightBorder: '#e3e8f0',
        lightPurple: '#8C6EFF',

        // Dark Theme (Enhanced modern)
        gptdark: '#1f1f2e',
        navdark: '#2a2a3c',
        sidebar: '#252539',
        botdark: '#333348',
        userdarkhover: '#44445c',

        // Message Bubble Colors
        botPurple: '#8C6EFF',
        userWhite: '#ffffff',
        userBorder: '#d1d5db',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in-left': 'slideInLeft 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },


        // **************************************
        //   @keyframes fadeIn {
        //     from { opacity: 0; transform: scale(0.95); }
        //     to { opacity: 1; transform: scale(1); }
        //   }

        //   .animate-fadeIn {
        //     animation: fadeIn 0.8s ease-out;
        //   }

        // **************************************
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-10%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};