import { useState, useEffect } from "react";
import { LayoutGrid, Car, CalendarCheck, CalendarDays, ShieldAlert, FileText } from "lucide-react";

export default function Sidebar({ activePage = "dashboard", onNavigate }) {
  const userRole = localStorage.getItem("userRole") || "employee"; 
  const isAdmin = userRole.trim().toLowerCase() === "admin";
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
        <button className={`sidebar-nav-item ${activePage === "bookings" ? "is-active" : ""}`} onClick={() => onNavigate?.("bookings")}>
          <CalendarCheck size={18} /> <span>การจองของฉัน</span>
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