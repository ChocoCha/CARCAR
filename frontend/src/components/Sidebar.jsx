import { useState, useEffect } from "react";
import { LayoutGrid, Car, CalendarCheck, CalendarDays, ShieldAlert, FileText } from "lucide-react";

export default function Sidebar({ activePage = "dashboard", onNavigate }) {
  const API_BASE = `http://${window.location.hostname}:5000/api`;
  const userRole = localStorage.getItem("userRole") || "employee"; 
  const isAdmin = userRole.trim().toLowerCase() === "admin";
  const borrowerEmpId = (localStorage.getItem("borrowerEmpId") || "").toLowerCase().trim();
  const borrowerName = (localStorage.getItem("borrowerName") || "").toLowerCase().trim();

  const [warningCount, setWarningCount] = useState(0);
  const [activeBookingCount, setActiveBookingCount] = useState(0);

  useEffect(() => {
    fetchActiveBookingsCount();
    if (isAdmin) checkActExpiry();
  }, [isAdmin]);

  // 🟢 ดึงจำนวนคิวจองที่กำลังใช้งานอยู่ของผู้ใช้คนนี้ (active และยังไม่คืน/ไม่ยกเลิก)
  async function fetchActiveBookingsCount() {
    try {
      const empParam = borrowerEmpId || borrowerName;
      const res = await fetch(`${API_BASE}/bookings?borrower=${encodeURIComponent(empParam)}&role=${userRole}&isMyBooking=true`);
      if (res.ok) {
        const data = await res.json();
        const count = (Array.isArray(data) ? data : []).filter(b => {
          const bBorrower = (b.borrower || "").toLowerCase().trim();
          const isMine = bBorrower === borrowerEmpId || bBorrower === borrowerName;
          const isActive = b.status === 'active';
          const hasVehicle = !!b.vehicle_id;
          return isMine && isActive && hasVehicle;
        }).length;

        setActiveBookingCount(count);
      }
    } catch (err) {
      console.error("ดึงจำนวนการจองไม่สำเร็จ:", err);
    }
  }

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

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <Car size={18} strokeWidth={2.5} />
        </div>
        <div>
          <div className="sidebar-brand-name">SystemPrime</div>
          <div className="sidebar-brand-sub">Car Reservation</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button className={`sidebar-nav-item ${activePage === "dashboard" ? "is-active" : ""}`} onClick={() => onNavigate?.("dashboard")}>
          <LayoutGrid size={18} /> <span>หน้าหลัก</span>
        </button>

        {/* 🟢 ปุ่มการจองของฉัน พร้อม Badge สีแดงแสดงจำนวนคิวที่ยังไม่คืน */}
        <button 
          className={`sidebar-nav-item ${activePage === "bookings" ? "is-active" : ""}`} 
          onClick={() => onNavigate?.("bookings")}
          style={{ justifyContent: "space-between" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CalendarCheck size={18} /> <span>การจองของฉัน</span>
          </div>
          {activeBookingCount > 0 && (
            <span 
              className="badge-red" 
              style={{
                backgroundColor: "#DC2626",
                color: "#FFFFFF",
                fontSize: "11px",
                fontWeight: "800",
                minWidth: "18px",
                height: "18px",
                borderRadius: "9px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 6px",
                boxShadow: "0 2px 6px rgba(220, 38, 38, 0.4)"
              }}
            >
              {activeBookingCount}
            </span>
          )}
        </button>

        <button className={`sidebar-nav-item ${activePage === "traffic" ? "is-active" : ""}`} onClick={() => onNavigate?.("traffic")}>
          <CalendarDays size={18} /> <span>ปฏิทินการจอง</span>
        </button>

        {isAdmin && (
          <>
            <div style={{ borderTop: "1px dashed var(--sidebar-line)", margin: "8px 0" }} />
            
            <button className={`sidebar-nav-item ${activePage === "act-management" ? "is-active" : ""}`} onClick={() => onNavigate?.("act-management")} style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={18} style={{ color: "var(--red)" }} />
                <span>ข้อมูล พ.ร.บ.</span>
              </div>
              {warningCount > 0 && (
                <span className="badge-red">{warningCount}</span>
              )}
            </button>

            <button className={`sidebar-nav-item ${activePage === "admin-panel" ? "is-active" : ""}`} onClick={() => onNavigate?.("admin-panel")}>
              <ShieldAlert size={18} style={{ color: "var(--amber)" }} /> <span>แผงผู้ดูแลระบบ</span>
            </button>
          </>
        )}
      </nav>
    </aside>
  );
}