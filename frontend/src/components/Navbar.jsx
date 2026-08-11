import { useState, useRef, useEffect } from "react";
// 🟢 เพิ่ม User เข้ามาใน Lucide Icons
import { LogOut, ChevronDown, Menu, LayoutGrid, CalendarCheck, CalendarDays, ShieldAlert, FileText, User } from "lucide-react";

export default function Navbar({ onNavigate }) {
  const API_BASE = `http://${window.location.hostname}:5000/api`;
  
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("borrowerName") || "ผู้ใช้งานระบบ");
  const userRole = localStorage.getItem("userRole") || "employee";
  const borrowerEmpId = localStorage.getItem("borrowerEmpId");
  const isAdmin = userRole.trim().toLowerCase() === "admin";

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  const [warningCount, setWarningCount] = useState(0);

  useEffect(() => {
    fetchLatestUserProfile();
  }, []);

  async function fetchLatestUserProfile() {
    if (!borrowerEmpId) return;
    try {
      const res = await fetch(`${API_BASE}/employees`);
      if (res.ok) {
        const employees = await res.json();
        const me = employees.find(emp => emp.id?.toString().trim().toUpperCase() === borrowerEmpId.toString().trim().toUpperCase());
        if (me && me.name) {
          setCurrentUser(me.name);
          localStorage.setItem("borrowerName", me.name);
        }
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  }

  useEffect(() => {
    if (isAdmin) checkActExpiry();
  }, [isAdmin]);

  async function checkActExpiry() {
    try {
      const res = await fetch(`${API_BASE}/vehicles`);
      if (res.ok) {
        const vehicles = await res.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const ninetyDaysLater = new Date();
        ninetyDaysLater.setDate(today.getDate() + 90);

        const count = vehicles.filter(v => {
          if (!v.act_expiry_date) return false;
          const exp = new Date(v.act_expiry_date);
          exp.setHours(0, 0, 0, 0);
          return exp <= ninetyDaysLater;
        }).length;

        setWarningCount(count);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (!confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) return;
    localStorage.clear();
    window.location.reload();
  };

  const handleMenuClick = (targetPage) => {
    setIsMobileMenuOpen(false);
    if (typeof onNavigate === "function") {
      onNavigate(targetPage);
    }
  };

  return (
    <header className="navbar">
      {/* 🟢 ฝั่งซ้าย: ปุ่มสามขีด (โชว์เฉพาะมือถือ/จอย่อ) */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div ref={mobileMenuRef} className="mobile-menu-wrapper" style={{ position: "relative" }}>
          <button 
            type="button" 
            className="navbar-icon-btn mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu size={20} />
          </button>

          {/* Dropdown เมนูนำทาง + ออกจากระบบ รวมในสามขีดฝั่งซ้าย */}
          {isMobileMenuOpen && (
            <div className="mobile-dropdown-menu" style={{ left: 0, right: "auto" }}>
              <div style={{ padding: "8px 12px", fontSize: "12px", fontWeight: "bold", color: "var(--sidebar-text-dim)", borderBottom: "1px solid var(--sidebar-line)", marginBottom: "4px" }}>
                👤 {currentUser}
              </div>

              <button type="button" onClick={() => handleMenuClick("dashboard")} className="dropdown-item">
                <LayoutGrid size={17} /> หน้าหลัก
              </button>
              <button type="button" onClick={() => handleMenuClick("bookings")} className="dropdown-item">
                <CalendarCheck size={17} /> การจองของฉัน
              </button>
              <button type="button" onClick={() => handleMenuClick("traffic")} className="dropdown-item">
                <CalendarDays size={17} /> ปฏิทินการจอง
              </button>

              {isAdmin && (
                <>
                  <div style={{ borderTop: "1px dashed var(--sidebar-line)", margin: "6px 0" }} />
                  <button type="button" onClick={() => handleMenuClick("act-management")} className="dropdown-item text-red">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", justifyContent: "space-between" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <FileText size={17} /> ข้อมูล พ.ร.บ.
                      </span>
                      {warningCount > 0 && <span className="badge-red">{warningCount}</span>}
                    </div>
                  </button>
                  <button type="button" onClick={() => handleMenuClick("admin-panel")} className="dropdown-item text-amber">
                    <ShieldAlert size={17} /> แผงผู้ดูแลระบบ
                  </button>
                </>
              )}

              <div style={{ borderTop: "1px solid var(--sidebar-line)", margin: "6px 0" }} />
              <button type="button" onClick={handleLogout} className="dropdown-item text-red">
                <LogOut size={16} /> ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🟢 ฝั่งขวา: โปรไฟล์ผู้ใช้สำหรับหน้าจอคอม Desktop */}
      <div className="navbar-actions">
        <div ref={dropdownRef} className="desktop-user-wrapper" style={{ position: "relative" }}>
          <button 
            type="button"
            className="navbar-user"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {/* 🟢 เปลี่ยนเป็นไอคอน User แทนสีส้ม */}
            <div className="navbar-user-avatar">
              <User size={15} />
            </div>
            <span className="navbar-user-name">{currentUser}</span>
            <ChevronDown size={14} style={{ color: "var(--sidebar-text-dim)", transform: isDropdownOpen ? "rotate(180deg)" : "none", transition: "0.2s" }} />
          </button>

          {isDropdownOpen && (
            <div className="user-dropdown-menu">
              <button type="button" onClick={handleLogout} className="dropdown-item text-red">
                <LogOut size={14} /> ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}