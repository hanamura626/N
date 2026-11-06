/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00685F',
          on: '#FFFFFF',
          container: '#9CF2E8',
          'on-container': '#00201D',
        },
        secondary: {
          DEFAULT: '#4A6360',
          container: '#CDE8E5',
          'on-container': '#051F1D',
        },
        tertiary: {
          DEFAULT: '#2F5F8A',
          container: '#CCE5FF',
          'on-container': '#001D36',
        },
        success: {
          DEFAULT: '#1B6D2F',
          container: '#A6F2B0',
          'on-container': '#002108',
        },
        error: {
          DEFAULT: '#BA1A1A',
          container: '#FFDAD6',
          'on-container': '#410002',
        },
        surface: {
          DEFAULT: '#F5FBFA',
          container: '#E9F0EF',
          high: '#E3EAE9',
        },
        'on-surface': '#171D1C',
        'on-surface-variant': '#3F4947',
        outline: '#6F7977',
        'outline-variant': '#BEC9C6',
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
