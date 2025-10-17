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
        'geniex-purple': '#3a0ca3',



        // Dark Theme (Enhanced modern)
        gptdark: '#1f1f2e',
        navdark: '#2a2a3c',
        sidebar: '#252539',
        botdark: '#333348',
        userdarkhover: '#44445c',


        // Message Bubble Colors
        // botPurple: '#8C6EFF',
        // userWhite: '#ffffff',
        // userBorder: '#d1d5db',
                
        // Message Bubble Colors (Swapped!)
        botPurple: '#ffffff',   // Bot now uses white bubbles
        userWhite: '#8C6EFF',   // User now uses purple bubbles
        userBorder: '#d1d5db',  // You can keep or adjust this
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },


      animation: {
          bounce: 'bounce 1.5s infinite',
          pulse: 'pulse 2s infinite',
          shimmer: 'shimmer 1.5s infinite linear',
          'fade-in': 'fadeIn 1s ease-in-out',
          'fade-in-up': 'fadeInUp 1s ease-out',

          'slide-in-left': 'slideInLeft 0.4s ease-out',
          wave: 'wave 1.2s infinite ease-in-out',

      },
      backgroundSize: {
        shimmer: '200% 100%',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-100% 0' },
          '100%': { backgroundPosition: '100% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },

      },
      
    },
  },
  plugins: [],
};