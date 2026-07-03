import { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MyBookings from "./pages/MyBookings";       // 🟢 ดึงหน้าการจองของฉันเข้ามา
import TrafficCalendar from "./pages/TrafficCalendar"; // 🟢 ดึงหน้าปฏิทิน 30 วันเข้ามา
import AdminManagement from "./pages/AdminManagement";
import "./styles/global.css";

export default function App() {
  // 🟢 [ไม้ตายแก้บั๊กรีเฟรช]: ตรวจสอบกล่องความจำเบราว์เซอร์ก่อนคัป ถ้าเคย Login ค้างไว้ให้เข้าหน้า Dashboard ทันที
  const [currentPage, setCurrentPage] = useState(() => {
    const savedUser = localStorage.getItem("borrowerName");
    const savedRole = localStorage.getItem("userRole");
    
    // ถ้าในเครื่องมีข้อมูลชื่อและสิทธิ์ แปลว่าล็อกอินค้างไว้ -> ให้ข้ามไปหน้าแดชบอร์ดเลยคัป
    if (savedUser && savedRole) {
      return "dashboard"; 
    }
    // ถ้าไม่มีข้อมูล ให้เปิดหน้า login ตามปกติ
    return "login";
  });

  // ฟังก์ชันสําหรับกรณีกด Logout ออกจากระบบ (ส่งไปใช้ใน Sidebar หรือจุดอื่น ๆ ได้คัป)
  const handleLogout = () => {
    localStorage.clear(); // ล้างข้อมูลความจำในเครื่องทั้งหมด
    setCurrentPage("login"); // ดีดกลับหน้าล็อกอิน
  };

  // ด่านที่ 1: ถ้ายังไม่ได้ล็อกอิน (ยังเป็น 'login' อยู่) ให้เปิดหน้าล็อกอินขึ้นมาโชว์ก่อน
  if (currentPage === "login") {
    return <Login onLoginSuccess={() => setCurrentPage("dashboard")} />;
  }

  // ด่านที่ 2: เมื่อล็อกอินผ่านแล้ว ระบบจะสลับหน้าจอตามคำสั่งที่กดมาจาก Sidebar อัตโนมัติ
  return (
    <>
      {currentPage === "dashboard" && (
        <Dashboard onNavigate={(target) => setCurrentPage(target)} onLogout={handleLogout} />
      )}
      
      {currentPage === "bookings" && (
        <MyBookings onNavigate={(target) => setCurrentPage(target)} onLogout={handleLogout} />
      )}
      
      {currentPage === "traffic" && (
        <TrafficCalendar onNavigate={(target) => setCurrentPage(target)} onLogout={handleLogout} />
      )}
      
      {currentPage === "admin-panel" && (
        <AdminManagement onNavigate={(target) => setCurrentPage(target)} onLogout={handleLogout} />
      )}
    </>
  );
}