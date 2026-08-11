import { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { Clock, Calendar, User, KeyRound, Tag, Eye, Trash2, X, ClipboardList, History, Maximize2 } from "lucide-react";

export default function MyBookings({ onNavigate }) {
  const API_BASE = `http://${window.location.hostname}:5000/api`;

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600";
    if (imagePath.startsWith("http")) return imagePath;
    return `http://${window.location.hostname}:5000${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
  };

  const [currentUser, setCurrentUser] = useState(localStorage.getItem("borrowerName") || "ผู้ใช้งาน");
  const borrowerEmpId = localStorage.getItem("borrowerEmpId");
  
  const [activeSubTab, setActiveSubTab] = useState("current");
  const [myBookings, setMyBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);

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
      console.error("Error fetching profile:", err);
    }
  }

  useEffect(() => {
    fetchMyBookings();
  }, [currentUser]);

  async function fetchMyBookings() {
    try {
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
            image: getImageUrl(rawImg)
          };
        });
        setMyBookings(updatedBookings);
      }
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูลการจอง:", err);
    }
  }

  async function handleCancelBooking(bookingId, modelName) {
    if (!confirm(`ยืนยันคำขอยกเลิกการจองคิวรถยนต์ [ ${modelName} ] ใช่หรือไม่?`)) return;

    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
        method: "PUT"
      });

      if (res.ok) {
        alert("ยกเลิกการจองรถยนต์สำเร็จเรียบร้อยแล้ว!");
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

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysAgoStr = getSafeDateStr(ninetyDaysAgo);

  // 🟢 ดึงรหัสพนักงานหรือชื่อผู้จองเพื่อจับคู่ข้อมูลให้ตรงกันแม่นยำ
  const myEmpId = (localStorage.getItem("borrowerEmpId") || "").toLowerCase().trim();
  const myName = (localStorage.getItem("borrowerName") || currentUser || "").toLowerCase().trim();

  const totalOwnBookings = myBookings.filter(booking => {
    const bookingBorrower = (booking.borrower || "").toLowerCase().trim();
    return bookingBorrower === myEmpId || bookingBorrower === myName;
  });

  // 🟢 กรองคิวที่มีผลใช้งานจริง (ซ่อนคิวอนาคตของรถที่โดนลบทิ้ง)
  const validOwnBookings = totalOwnBookings.filter(booking => {
    if (!booking.start_date) return false;
    const startDateStr = getSafeDateStr(booking.start_date);
    const hasVehicle = !!booking.vehicle_id;

    // คิวอนาคตที่ไม่มีตัวรถแล้ว จะถูกกรองออก
    if (!hasVehicle && startDateStr > todayStr) {
      return false;
    }
    return true;
  });

  const filteredBookings = validOwnBookings.filter(booking => {
    const endDateStr = getSafeDateStr(booking.end_date);
    const isCancelled = booking.status === 'cancelled';
    const isExpired = endDateStr < todayStr;
    const isVehicleDeleted = !booking.vehicle_id; // 🟢 รถโดนลบไปแล้ว

    if (activeSubTab === "current") {
      // รายการปัจจุบัน: รถต้องยังอยู่ + ไม่หมดอายุ + ไม่ยกเลิก
      return !isExpired && !isCancelled && !isVehicleDeleted;
    } else {
      // ประวัติย้อนหลัง: หมดอายุแล้ว OR ยกเลิก OR รถโดนลบทิ้งไปแล้ว
      const isWithin3Months = endDateStr >= ninetyDaysAgoStr;
      return (isExpired || isCancelled || isVehicleDeleted) && isWithin3Months;
    }
  });

  return (
    <MainLayout
      activePage="bookings"
      onNavigate={onNavigate}
      title="รายการจองของฉัน"
      subtitle="รายการคำขอใช้สิทธิ์รถยนต์และประวัติใช้งานย้อนหลังส่วนบุคคล (แสดงย้อนหลัง 3 เดือนล่าสุด)"
    >
      <div className="dashboard-user-banner" style={{ marginBottom: "20px" }}>
        <div className="user-banner-welcome">
          <User size={18} className="icon-gold" />
          <span>ผู้ใช้งาน: <strong>{localStorage.getItem("borrowerName") || currentUser}</strong></span>
        </div>
      </div>

      <div className="mybk-tabs">
        <button
          type="button"
          onClick={() => setActiveSubTab("current")}
          className={`mybk-tab ${activeSubTab === "current" ? "is-active" : ""}`}
        >
          <ClipboardList size={16} /> รายการจองปัจจุบัน
          <span className="mybk-tab-count">{validOwnBookings.filter(b => getSafeDateStr(b.end_date) >= todayStr && b.status !== 'cancelled' && !!b.vehicle_id).length}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("history")}
          className={`mybk-tab ${activeSubTab === "history" ? "is-active" : ""}`}
        >
          <History size={16} /> ประวัติการจองย้อนหลัง
          <span className="mybk-tab-count">{validOwnBookings.filter(b => (getSafeDateStr(b.end_date) < todayStr || b.status === 'cancelled' || !b.vehicle_id) && getSafeDateStr(b.end_date) >= ninetyDaysAgoStr).length}</span>
        </button>
      </div>

      <div className="mybk-list">
        {filteredBookings.length === 0 ? (
          <div className="mybk-empty">
            {activeSubTab === "current" ? "ไม่มีรายการจองรถยนต์ที่กำลังเปิดใช้งานอยู่ในขณะนี้" : "ยังไม่มีประวัติการใช้งานรถยนต์ย้อนหลังในช่วง 3 เดือนที่ผ่านมา"}
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div key={booking.id} className="mybk-card">
              <div style={{ flex: 1, minWidth: "250px" }}>
                <h4 className="mybk-card-title">
                  <Tag size={16} className="icon-gold" /> {booking.vehicle_model}

                  {!booking.vehicle_id && (
                    <span className="mybk-badge is-done" style={{ backgroundColor: "#F3F4F6", color: "#4B5563" }}> ไม่พบข้อมูลรถ (ลบออกแล้ว)</span>
                  )}
                  {booking.status === 'cancelled' && (
                    <span className="mybk-badge is-cancelled">❌ ยกเลิกการจอง</span>
                  )}
                  {getSafeDateStr(booking.end_date) < todayStr && booking.status !== 'cancelled' && !!booking.vehicle_id && (
                    <span className="mybk-badge is-done">เสร็จสิ้นแล้ว</span>
                  )}
                </h4>

                <div className="mybk-borrower">
                  ผู้จองรถ: {booking.borrower_real_name || currentUser}
                </div>

                <div className="mybk-meta-row">
                  <span><Calendar size={14} /> เริ่มต้น: {formatDate(booking.start_date)}</span>
                  <span><Clock size={14} /> สิ้นสุด: {formatDate(booking.end_date)}</span>
                  <span><KeyRound size={14} /> รหัสคิว: BOOK-{booking.id}</span>
                </div>
              </div>

              <div className="mybk-actions">
                <button type="button" onClick={() => handleOpenDetails(booking)} className="mybk-btn is-view">
                  <Eye size={14} /> รายละเอียด
                </button>

                {activeSubTab === "current" && booking.status !== 'cancelled' && !!booking.vehicle_id && (
                  <button type="button" onClick={() => handleCancelBooking(booking.id, booking.vehicle_model)} className="mybk-btn is-cancel">
                    <Trash2 size={14} /> ยกเลิกการจอง
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* POPUP MODALS รายละเอียดรูปภาพรถยนต์ */}
      {isModalOpen && selectedBooking && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="booking-modal fg-rise" style={{ maxWidth: "480px", width: "90%", backgroundColor: "#fff", padding: "20px", borderRadius: "12px" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>รายละเอียดการจองรถยนต์</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="close-btn"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                <div
                  onClick={() => setZoomedImage(selectedBooking.image)}
                  title="คลิกส่องดูรูปขนาดใหญ่"
                  style={{ width: "100%", aspectRatio: "16 / 10", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--line)", backgroundColor: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", cursor: "pointer" }}
                >
                  <img
                    src={selectedBooking.image}
                    alt={selectedBooking.vehicle_model}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                    onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600"; }}
                  />
                  <div style={{ position: "absolute", bottom: "8px", right: "8px", backgroundColor: "rgba(13,12,8,0.72)", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", fontWeight: "500" }}>
                    <Maximize2 size={12} /> คลิกขยายรูป
                  </div>
                </div>

                <div>
                  <h3 className="mybk-detail-title">{selectedBooking.vehicle_model}</h3>
                  <p className="mybk-detail-row"><strong>รหัสคิวการจอง:</strong> BOOK-{selectedBooking.id}</p>

                  <p className="mybk-detail-row">
                    <strong>ผู้ขอใช้สิทธิ์:</strong> <span className="mybk-detail-highlight">{selectedBooking.borrower_real_name || currentUser}</span>
                  </p>

                  <p className="mybk-detail-row"><strong>กำหนดวันเริ่มต้นคิว:</strong> {formatDate(selectedBooking.start_date)}</p>
                  <p className="mybk-detail-row"><strong>กำหนดวันสิ้นสุดคิว:</strong> {formatDate(selectedBooking.end_date)}</p>
                  <p className="mybk-detail-row">
                    <strong>สถานะคิว:</strong> {!selectedBooking.vehicle_id ? <span className="mybk-status-cancelled">ไม่พบข้อมูลรถ (ลบออกจากคลัง)</span> : selectedBooking.status === 'cancelled' ? <span className="mybk-status-cancelled">ยกเลิกการจอง</span> : <span className="mybk-status-ok">ปกติ / สมบูรณ์</span>}
                  </p>
                </div>
              </div>
              <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-dark" style={{ width: "100%" }}>ปิดหน้าต่างรายละเอียด</button>
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