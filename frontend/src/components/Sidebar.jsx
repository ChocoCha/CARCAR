import { LayoutGrid, Car, CalendarCheck, CalendarDays, ShieldAlert } from "lucide-react";

export default function Sidebar({ activePage = "dashboard", onNavigate }) {
  // 🟢 [จุดปลดล็อกไม้เด็ด] เปลี่ยนมาดึงค่าสิทธิ์ userRole (admin/employee) ตรงๆ จากเครื่องเลยครับ คลีนและแม่นยำ 100%
  const userRole = localStorage.getItem("userRole") || "employee"; 
  const isAdmin = userRole.trim().toLowerCase() === "admin";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <Car size={16} strokeWidth={2.5} />
        </div>
        <div>
          <div className="sidebar-brand-name">SystemPrime</div>
          <div className="sidebar-brand-sub">Car Reservation</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* เมนูหลักที่ทุกคนมองเห็น */}
        <button key="dashboard" className={`sidebar-nav-item ${activePage === "dashboard" ? "is-active" : ""}`} onClick={() => onNavigate?.("dashboard")}>
          <LayoutGrid size={17} /> <span>หน้าหลัก</span>
        </button>
        <button key="bookings" className={`sidebar-nav-item ${activePage === "bookings" ? "is-active" : ""}`} onClick={() => onNavigate?.("bookings")}>
          <CalendarCheck size={17} /> <span>การจองของฉัน</span>
        </button>
        <button key="traffic" className={`sidebar-nav-item ${activePage === "traffic" ? "is-active" : ""}`} onClick={() => onNavigate?.("traffic")}>
          <CalendarDays size={17} /> <span>ปฏิทินการจอง</span>
        </button>

        {/* 🟢 เมนูพิเศษ: ปลดล็อกทันตาเห็นเมื่อ userRole ในเครื่องระบุสถานะว่าเป็น admin คัป! */}
        {isAdmin && (
          <button key="admin-panel" className={`sidebar-nav-item ${activePage === "admin-panel" ? "is-active" : ""}`} onClick={() => onNavigate?.("admin-panel")} style={{ borderTop: "1px dashed #d1d5db", marginTop: "12px", paddingTop: "12px", color: "#B45309" }}>
            <ShieldAlert size={17} style={{ color: "#D97706" }} /> <span style={{ fontWeight: "700" }}>แผงผู้ดูแลระบบ</span>
          </button>
        )}
      </nav>
    </aside>
  );
}