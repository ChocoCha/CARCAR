import { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { Clock, Calendar, User, KeyRound, Tag, Eye, Trash2, X, ClipboardList, History, Maximize2 } from "lucide-react";

export default function MyBookings({ onNavigate }) {
  // 🟢 ดึง IP ของเครื่องเซิร์ฟเวอร์อัตโนมัติ
  const API_BASE = `http://${window.location.hostname}:5000/api`;

  // 🟢 Helper แปลง Path รูปภาพให้เป็น URL สมบูรณ์
  const getImageUrl = (imagePath) => {
    if (!imagePath) return "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600";
    if (imagePath.startsWith("http")) return imagePath;
    return `http://${window.location.hostname}:5000${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
  };

  const [currentUser] = useState(localStorage.getItem("borrowerName") || "ผู้ใช้งาน");  
  const [activeSubTab, setActiveSubTab] = useState("current"); // 'current' | 'history'
  const [myBookings, setMyBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);

  useEffect(() => {
    fetchMyBookings();
  }, [currentUser]); 

  async function fetchMyBookings() {
    try {
      // 🟢 ดึงข้อมูลผ่าน API_BASE
      const resVehicles = await fetch(`${API_BASE}/vehicles`);
      let currentVehicles = [];
      if (resVehicles.ok) {
        currentVehicles = await resVehicles.json();
        setVehicles(currentVehicles);
      }

      const empId = localStorage.getItem("borrowerEmpId") || currentUser;
      const userRole = localStorage.getItem("userRole") || "employee";
      
      const res = await fetch(`${API_BASE}/bookings?borrower=${encodeURIComponent(empId)}&role=${userRole}&isMyBooking=true`);
      if (res.ok) {
        const bookingsData = await res.json();
        
        const updatedBookings = bookingsData.map(b => {
          const matchedCar = currentVehicles.find(c => c.id?.toLowerCase().trim() === (b.vehicle_id || "").toLowerCase().trim());
          const rawImg = matchedCar ? matchedCar.image : b.image;
          return {
            ...b,
            image: getImageUrl(rawImg) // 🟢 แปลงเป็น URL สมบูรณ์
          };
        });
        setMyBookings(updatedBookings);
      }
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูลการจอง:", err);
    }
  }

  // 🟢 ยกเลิกการจอง
  async function handleCancelBooking(bookingId, modelName) {
    if (!confirm(`⚠️ ยืนยันยกเลิกคำขอจองคิวรถ [ ${modelName} ] ใช่หรือไม่?\n(สถานะจะเปลี่ยนเป็นยกเลิก และปลดล็อกคิวในปฏิทินทันที)`)) return;

    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
        method: "PUT"
      });

      if (res.ok) {
        alert("🎯 ยกเลิกสิทธิ์การจองรถยนต์สำเร็จเรียบร้อยแล้ว!");
        fetchMyBookings(); 
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleOpenDetails(booking) {
    const matchedCar = vehicles.find(c => c.id?.toLowerCase().trim() === (booking.vehicle_id || "").toLowerCase().trim());
    const rawImg = matchedCar ? matchedCar.image : booking.image;
    setSelectedBooking({
      ...booking,
      image: getImageUrl(rawImg)
    });
    setIsModalOpen(true);
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const thaiMonthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    return `${d.getDate()} ${thaiMonthsShort[d.getMonth()]} ${d.getFullYear() + 543}`; 
  };

  const getSafeDateStr = (dateInput) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getSafeDateStr(new Date());

  const myEmpId = (localStorage.getItem("borrowerEmpId") || "").toLowerCase().trim();
  
  const totalOwnBookings = myBookings.filter(booking => {
    const bookingBorrower = (booking.borrower || "").toLowerCase().trim();
    return bookingBorrower === myEmpId;
  });

  const filteredBookings = totalOwnBookings.filter(booking => {
    if (!booking.end_date) return false;
    const endDateStr = getSafeDateStr(booking.end_date);
    const isCancelled = booking.status === 'cancelled';
    const isExpired = endDateStr < todayStr;

    if (activeSubTab === "current") {
      return !isExpired && !isCancelled;
    } else {
      return isExpired || isCancelled;
    }
  });

  return (
    <MainLayout 
      activePage="bookings" 
      onNavigate={onNavigate} 
      title="📅 รายการจองของฉัน" 
      subtitle="รายการคำขอใช้สิทธิ์รถยนต์และประวัติใช้งานย้อนหลังส่วนบุคคล"
    >
      <div className="dashboard-user-banner" style={{ marginBottom: "20px" }}>
        <div className="user-banner-welcome">
          <User size={18} className="icon-gold" />
          <span>บัญชีผู้ใช้งาน: <strong>{localStorage.getItem("borrowerName") || currentUser}</strong></span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", borderBottom: "2px solid #f3f4f6", paddingBottom: "10px" }}>
        <button 
          type="button"
          onClick={() => setActiveSubTab("current")} 
          style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: activeSubTab === "current" ? "#1e3a8a" : "transparent", color: activeSubTab === "current" ? "#fff" : "#4b5563", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <ClipboardList size={16} /> รายการจองปัจจุบัน ({totalOwnBookings.filter(b => getSafeDateStr(b.end_date) >= todayStr && b.status !== 'cancelled').length})
        </button>
        <button 
          type="button"
          onClick={() => setActiveSubTab("history")} 
          style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: activeSubTab === "history" ? "#6b7280" : "transparent", color: activeSubTab === "history" ? "#fff" : "#4b5563", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <History size={16} /> ประวัติการจองย้อนหลัง ({totalOwnBookings.filter(b => getSafeDateStr(b.end_date) < todayStr || b.status === 'cancelled').length})
        </button>
      </div>

      <div className="my-bookings-list" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filteredBookings.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px dashed #d1d5db", color: "#6b7280", fontSize: "14px" }}>
            {activeSubTab === "current" ? "ไม่มีรายการจองรถยนต์ที่กำลังเปิดใช้งานอยู่ในขณะนี้" : "ยังไม่มีประวัติการใช้งานรถยนต์ย้อนหลังในระบบ"}
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div key={booking.id} style={{ padding: "20px", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ flex: 1, minWidth: "250px" }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Tag size={16} style={{ color: "#D97706" }} /> {booking.vehicle_model}
                  
                  {booking.status === 'cancelled' && (
                    <span style={{ fontSize: "11px", padding: "2px 8px", backgroundColor: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: "4px", fontWeight: "bold" }}>
                      ❌ ยกเลิกการจอง
                    </span>
                  )}
                  {getSafeDateStr(booking.end_date) < todayStr && booking.status !== 'cancelled' && (
                    <span style={{ fontSize: "11px", padding: "2px 8px", backgroundColor: "#F3F4F6", color: "#4B5563", border: "1px solid #D1D5DB", borderRadius: "4px", fontWeight: "bold" }}>
                      🏁 เสร็จสิ้นแล้ว
                    </span>
                  )}
                </h4>
                
                <div style={{ display: "flex", gap: "24px", fontSize: "13px", color: "#4b5563", flexWrap: "wrap", marginBottom: "6px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#1e3a8a", fontWeight: "600" }}>
                    <User size={14} /> ผู้จองรถ: {booking.borrower === 'admin' || booking.borrower_real_name === 'ผู้ดูแลระบบสูงสุด' ? "ผู้ดูแลระบบสูงสุด" : (booking.borrower_real_name || currentUser)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "24px", fontSize: "13px", color: "#4b5563", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Calendar size={14} /> เริ่มต้น: {formatDate(booking.start_date)}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Clock size={14} /> สิ้นสุด: {formatDate(booking.end_date)}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><KeyRound size={14} /> รหัสคิว: BOOK-{booking.id}</span>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button 
                  type="button"
                  onClick={() => handleOpenDetails(booking)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: "6px", backgroundColor: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "#2563EB" }}
                >
                  <Eye size={14} /> รายละเอียด
                </button>
                
                {activeSubTab === "current" && booking.status !== 'cancelled' && (
                  <button 
                    type="button"
                    onClick={() => handleCancelBooking(booking.id, booking.vehicle_model)}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", border: "1px solid #fca5a5", borderRadius: "6px", backgroundColor: "#fef2f2", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "#dc2626" }}
                  >
                    <Trash2 size={14} /> ยกเลิกการจอง
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* POPUP MODALS รายละเอียดรูปภาพยานพาหนะ */}
      {isModalOpen && selectedBooking && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="booking-modal fg-rise" style={{ maxWidth: "480px", width: "90%", backgroundColor: "#fff", padding: "20px", borderRadius: "12px" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>🔎 รายละเอียดคิวยานพาหนะ</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                <div 
                  onClick={() => setZoomedImage(selectedBooking.image)}
                  title="คลิกส่องดูรูปขนาดใหญ่"
                  style={{ width: "100%", aspectRatio: "16 / 10", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", cursor: "pointer" }}
                >
                  <img 
                    src={selectedBooking.image} 
                    alt={selectedBooking.vehicle_model} 
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                    onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600"; }}
                  />
                  <div style={{ position: "absolute", bottom: "8px", right: "8px", backgroundColor: "rgba(0,0,0,0.65)", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", fontWeight: "500" }}>
                    <Maximize2 size={12} /> คลิกขยายรูป
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: "0 0 8px 0", color: "#1e3a8a", fontSize: "18px" }}>{selectedBooking.vehicle_model}</h3>
                  <p style={{ margin: "6px 0", fontSize: "14px", color: "#4b5563" }}><strong>รหัสคิวการจอง:</strong> BOOK-{selectedBooking.id}</p>
                  
                  <p style={{ margin: "6px 0", fontSize: "14px", color: "#4b5563" }}>
                    <strong>ผู้ขอใช้สิทธิ์:</strong> <span style={{ fontWeight: "600", color: "#1e3a8a" }}>{selectedBooking.borrower === 'admin' || selectedBooking.borrower_real_name === 'ผู้ดูแลระบบสูงสุด' ? "ผู้ดูแลระบบสูงสุด" : (selectedBooking.borrower_real_name || currentUser)}</span>
                  </p>
                  
                  <p style={{ margin: "6px 0", fontSize: "14px", color: "#4b5563" }}><strong>กำหนดวันเริ่มต้นคิว:</strong> {formatDate(selectedBooking.start_date)}</p>
                  <p style={{ margin: "6px 0", fontSize: "14px", color: "#4b5563" }}><strong>กำหนดวันสิ้นสุดคิว:</strong> {formatDate(selectedBooking.end_date)}</p>
                  <p style={{ margin: "6px 0", fontSize: "14px", color: "#4b5563" }}>
                    <strong>สถานะคิว:</strong> {selectedBooking.status === 'cancelled' ? <span style={{ color: "#DC2626", fontWeight: "bold" }}>ยกเลิกการจอง</span> : <span style={{ color: "#059669", fontWeight: "bold" }}>ปกติ / สมบูรณ์</span>}
                  </p>
                </div>
              </div>
              <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ width: "100%", padding: "10px", backgroundColor: "#1e3a8a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>ปิดหน้าต่างรายละเอียด</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX POPUP */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)} 
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, cursor: "zoom-out" }}
        >
          <button type="button" onClick={() => setZoomedImage(null)} style={{ position: "absolute", top: "20px", right: "24px", background: "none", border: "none", color: "#fff", cursor: "pointer" }}><X size={32} /></button>
          <div style={{ maxWidth: "90%", maxHeight: "85%", borderRadius: "8px", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <img 
              src={zoomedImage} 
              alt="Zoomed Preview" 
              style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", display: "block", backgroundColor: "#fff", padding: "4px" }} 
              onError={(e)=>{e.target.src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600"}}
            />
          </div>
        </div>
      )}
    </MainLayout>
  );
}