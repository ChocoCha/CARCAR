import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 🟢 สั่งให้ Vite กระจาย IP เปิดรับเครื่องอื่นในวง Wi-Fi
    port: 5173
  }
})