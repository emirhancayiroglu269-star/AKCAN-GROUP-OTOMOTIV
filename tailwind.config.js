/** @type {import('tailwindcss').Config} */
// "Atölye" görünümü: grafit + beton gri, atölye yeşili seçili/önemli işaret,
// gövdede Barlow, başlık ve büyük rakamlarda dar Barlow Condensed.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // atölye yeşili: 500 şerit/işaret, 600–700 düğme ve bağlantı (beyaz yazı okunur)
        marka: { 50: '#EAF7EF', 100: '#CDEFD9', 200: '#9FDEB6', 300: '#6CCB90', 400: '#3DB46C', 500: '#22A055', 600: '#178244', 700: '#126836', 800: '#0E5029', 900: '#0A3A1E' },
        // slate yerine çelik/beton grisi (mavi tonu yok)
        slate: { 50: '#F5F6F6', 100: '#E4E6E7', 200: '#D5D8DA', 300: '#BEC2C5', 400: '#8F959A', 500: '#687076', 600: '#4E555B', 700: '#3A3F44', 800: '#2C3035', 900: '#26292E', 950: '#1A1C1F' },
      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        dar: ['"Barlow Condensed"', 'Barlow', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
