import { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MyBookings from "./pages/MyBookings";       
import TrafficCalendar from "./pages/TrafficCalendar"; 
import AdminManagement from "./pages/AdminManagement";
import ActManagement from "./pages/ActManagement"; 
import "./styles/global.css";

export default function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    const savedUser = localStorage.getItem("borrowerName");
    const savedRole = localStorage.getItem("userRole");
    if (savedUser && savedRole) return "dashboard"; 
    return "login";
  });

  // 🟢 ฟังก์ชันสั่งเปลี่ยนหน้า
  const handleNavigate = (targetPage) => {
    setCurrentPage(targetPage);
  };

  const handleLogout = () => {
    localStorage.clear(); 
    setCurrentPage("login"); 
  };

  if (currentPage === "login") {
    return <Login onLoginSuccess={() => setCurrentPage("dashboard")} />;
  }

  return (
    <>
      {/* 🟢 ส่ง onNavigate={handleNavigate} ให้ครบทุกหน้า */}
      {currentPage === "dashboard" && (
        <Dashboard onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
      
      {currentPage === "bookings" && (
        <MyBookings onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
      
      {currentPage === "traffic" && (
        <TrafficCalendar onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
      
      {currentPage === "admin-panel" && (
        <AdminManagement onNavigate={handleNavigate} onLogout={handleLogout} />
      )}

      {currentPage === "act-management" && (
        <ActManagement onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
    </>
  );
}