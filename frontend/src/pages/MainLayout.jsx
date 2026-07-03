import Sidebar from "../components/Sidebar";

// 🟢 แกะกล่องเอา activePage และ onNavigate มาใช้งาน
export default function MainLayout({ children, activePage, onNavigate, title, subtitle }) {
  return (
    <div className="app-layout">
      {/* 🟢 ส่งต่อค่าให้ Sidebar เอาไปสั่งเปลี่ยนสีไอคอนและรับแรงกดคลิก */}
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      
      <main className="main-content">
        <header className="content-header">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </header>
        <div className="content-body">
          {children}
        </div>
      </main>
    </div>
  );
  {/* ==================== 🟢 แท็บที่ 3: ตารางรวมประวัติของพนักงานทุกคน (สิทธิ์ Admin ส่องดูได้เท่านั้น) ==================== */}
{activeSubTab === "all_bookings" && (
  <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", overflowX: "auto" }}>
    <h3 style={{ margin: "0 0 12px 0", color: "#374151" }}>สมุดประวัติคิวจองรถยนต์ของพนักงานทุกคนในระบบ</h3>
    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
      <thead>
        <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
          <th style={{ padding: "10px", textAlign: "left", fontSize: "13px" }}>รหัสคิว</th>
          <th style={{ padding: "10px", textAlign: "left", fontSize: "13px" }}>ชื่อผู้จองใช้งาน</th>
          <th style={{ padding: "10px", textAlign: "left", fontSize: "13px" }}>ยานพาหนะที่ใช้</th>
          <th style={{ padding: "10px", textAlign: "center", fontSize: "13px" }}>วันที่เริ่ม</th>
          <th style={{ padding: "10px", textAlign: "center", fontSize: "13px" }}>วันที่สิ้นสุด</th>
        </tr>
      </thead>
      <tbody>
        {/* ดึงค่าก้อน bookings ที่โหลดมาจากหลังบ้านมาทำการ Map แถวข้อมูลโชว์ในแผงควบคุม */}
        {bookings.length === 0 ? (
          <tr>
            <td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: "14px" }}>ยังไม่มีประวัติคิวการลงทะเบียนจองในฐานข้อมูลจริง</td>
          </tr>
        ) : (
          bookings.map(b => (
            <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}>
              <td style={{ padding: "12px", fontWeight: "700", color: "#1e3a8a" }}>BOOK-{b.id}</td>
              <td style={{ padding: "12px", fontWeight: "600" }}>{b.borrower}</td>
              <td style={{ padding: "12px", color: "#4b5563" }}>{b.vehicle_model}</td>
              <td style={{ padding: "12px", textAlign: "center" }}>{new Date(b.start_date).toLocaleDateString('th-TH')}</td>
              <td style={{ padding: "12px", textAlign: "center" }}>{new Date(b.end_date).toLocaleDateString('th-TH')}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
)}
}