/** @type {import('tailwindcss').Config} */
// "Atölye" görünümü: grafit + beton gri, raf etiketi sarısı yalnız seçili/önemli işaret (yazı rengi olarak kullanılmaz),
// gövdede Barlow, başlık ve büyük rakamlarda dar Barlow Condensed.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // raf etiketi sarısı: 400–500 zemin/şerit; 600–900 okunur koyu hardal (yazı ve bağlantılar)
        marka: { 50: '#FFF9DB', 100: '#FFF0A8', 200: '#FFE36B', 300: '#F9D43A', 400: '#F7CB12', 500: '#F2C200', 600: '#8A6900', 700: '#6E5400', 800: '#523F00', 900: '#372A00' },
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
