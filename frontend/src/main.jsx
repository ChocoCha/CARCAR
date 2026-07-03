import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx' // ตรวจสอบตัวพิมพ์เล็ก-ใหญ่ของโฟลเดอร์และชื่อไฟล์ให้ตรงกัน

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)