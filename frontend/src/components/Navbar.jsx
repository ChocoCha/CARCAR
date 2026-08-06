import { useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown, Menu, LayoutGrid, CalendarCheck, CalendarDays, ShieldAlert, FileText } from "lucide-react";

export default function Navbar({ onNavigate }) {
  const currentUser = localStorage.getItem("borrowerName") || "ผู้ใช้งานระบบ";
  const userRole = localStorage.getItem("userRole") || "employee";
  const isAdmin = userRole.trim().toLowerCase() === "admin";

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const navMenuRef = useRef(null);

  const [warningCount, setWarningCount] = useState(0);

  useEffect(() => {
    if (isAdmin) checkActExpiry();
  }, [isAdmin]);

  async function checkActExpiry() {
    try {
      const res = await fetch("http://localhost:5000/api/vehicles");
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
      if (navMenuRef.current && !navMenuRef.current.contains(event.target)) {
        setIsNavMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (!confirm("🔒 คุณต้องการออกจากระบบใช่หรือไม่?")) return;
    localStorage.clear();
    window.location.reload();
  };

  const handleMenuClick = (targetPage) => {
    setIsNavMenuOpen(false);
    if (typeof onNavigate === "function") {
      onNavigate(targetPage);
    }
  };

  return (
    <header className="navbar">
      {/* 🟢 ฝั่งซ้าย: ปุ่มเมนูสามขีด (แสดงบนมือถือ) */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div ref={navMenuRef} className="mobile-menu-wrapper" style={{ position: "relative" }}>
          <button 
            type="button" 
            className="navbar-icon-btn mobile-menu-btn"
            onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
          >
            <Menu size={20} />
          </button>

          {isNavMenuOpen && (
            <div className="mobile-dropdown-menu">
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
                  <div style={{ borderTop: "1px dashed var(--line)", margin: "6px 0" }} />
                  <button type="button" onClick={() => handleMenuClick("act-management")} className="dropdown-item text-red">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <FileText size={17} /> ข้อมูล พ.ร.บ.
                    </div>
                    {warningCount > 0 && (
                      <span className="badge-red">{warningCount}</span>
                    )}
                  </button>
                  <button type="button" onClick={() => handleMenuClick("admin-panel")} className="dropdown-item text-amber">
                    <ShieldAlert size={17} /> แผงผู้ดูแลระบบ
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🟢 ฝั่งขวา: โปรไฟล์ผู้ใช้ + Dropdown ล็อกเอาต์ */}
      <div className="navbar-actions">
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button 
            type="button"
            className="navbar-user"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="navbar-user-avatar" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "var(--ink)" }}>
              {currentUser.charAt(0)}
            </div>
            <span className="navbar-user-name">{currentUser}</span>
            <ChevronDown size={14} style={{ color: "var(--stone)", transform: isDropdownOpen ? "rotate(180deg)" : "none", transition: "0.2s" }} />
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