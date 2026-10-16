/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        marka: { 50: '#ecfdf7', 100: '#d1faec', 500: '#0f9f74', 600: '#0b8461', 700: '#0a6a4f', 900: '#073b2d' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
};
