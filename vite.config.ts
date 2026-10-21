import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages alt klasörde (/AKCAN-GROUP-OTOMOTIV/) yayınlandığı için dosya yolları göreli olmalı
  base: './',
  plugins: [react()],
})
