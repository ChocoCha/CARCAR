import { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { Clock, Calendar, User, KeyRound, Tag, Eye, Trash2, X, ClipboardList, History, Maximize2, AlertTriangle, CheckCircle, RotateCcw, Gauge, MapPin, AlertCircle } from "lucide-react";

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

  const [cancelConfirmTarget, setCancelConfirmTarget] = useState(null);
  
  const [returnTarget, setReturnTarget] = useState(null);
  const [inputMileage, setInputMileage] = useState("");
  const [mileageError, setMileageError] = useState("");

  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);

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
          const liveCarMileage = matchedCar && matchedCar.mileage !== undefined ? Number(matchedCar.mileage) : 0;

          // 🟢 ถ้าคิวยังรอคืนรถ (status === 'active') ให้ใช้ไมล์ล่าสุดของตัวรถเป็นไมล์ก่อนไปเสมอ
          const effectiveStartMileage = (b.status === 'active' && matchedCar) 
            ? liveCarMileage 
            : (b.start_mileage ?? liveCarMileage);

          return {
            ...b,
            start_mileage: effectiveStartMileage,
            currentVehicleMileage: liveCarMileage,
            image: getImageUrl(rawImg)
          };
        });
        setMyBookings(updatedBookings);
      }
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูลการจอง:", err);
    }
  }

  function handleRequestCancel(bookingId, modelName) {
    setCancelConfirmTarget({ id: bookingId, modelName });
  }

  async function executeCancelBooking() {
    if (!cancelConfirmTarget) return;
    const { id, modelName } = cancelConfirmTarget;

    try {
      const res = await fetch(`${API_BASE}/bookings/${id}/cancel`, { 
        method: "PUT",
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        setCancelConfirmTarget(null);
        setActionSuccessMessage(`ยกเลิกการจองรถยนต์ [ ${modelName} ] เรียบร้อยแล้ว`);
        await fetchMyBookings();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || "ไม่สามารถยกเลิกการจองได้");
      }
    } catch (err) {
      console.error("Cancel booking error:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  }

  // 🟢 เปิด Modal คืนรถ: ดึงไมล์ล่าสุดของตัวรถมาเป็นค่าตั้งต้นทันที
  function handleOpenReturnModal(booking) {
    const matchedCar = vehicles.find(c => c.id?.toLowerCase().trim() === (booking.vehicle_id || "").toLowerCase().trim());
    const baseMileage = matchedCar?.mileage !== undefined 
      ? Number(matchedCar.mileage) 
      : Number(booking.start_mileage ?? 0);

    setReturnTarget({
      ...booking,
      liveStartMileage: baseMileage
    });
    setInputMileage(String(baseMileage));
    setMileageError("");
  }

  async function executeReturnCar(e) {
    e.preventDefault();
    if (inputMileage === "" || isNaN(Number(inputMileage)) || Number(inputMileage) < 0) {
      setMileageError("กรุณากรอกตัวเลขไมล์ให้ถูกต้อง");
      return;
    }

    const currentBase = Number(returnTarget.liveStartMileage ?? returnTarget.start_mileage ?? 0);
    
    // ยอมรับค่าไมล์เท่าเดิมได้
    if (Number(inputMileage) < currentBase) {
      setMileageError(`เลขไมล์ตอนคืนต้องไม่น้อยกว่าไมล์เดิมก่อนใช้ (${currentBase.toLocaleString()} ไมล์)`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/bookings/${returnTarget.id}/return`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mileage: Number(inputMileage) })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const statusNote = data.isLate ? " \n(คืนรถล่าช้ากว่ากำหนด)" : "";
        setActionSuccessMessage(`คืนรถยนต์ ${returnTarget.vehicle_model} เรียบร้อยแล้ว!${statusNote} (บันทึกไมล์ล่าสุด: ${Number(inputMileage).toLocaleString()} ไมล์)`);
        setReturnTarget(null);
        await fetchMyBookings();
      } else {
        setMileageError(data.message || "เกิดข้อผิดพลาดในการคืนรถ");
      }
    } catch (err) {
      setMileageError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลังบ้านได้");
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

  const myEmpId = (localStorage.getItem("borrowerEmpId") || "").toLowerCase().trim();
  const myName = (localStorage.getItem("borrowerName") || currentUser || "").toLowerCase().trim();

  const totalOwnBookings = myBookings.filter(booking => {
    const bookingBorrower = (booking.borrower || "").toLowerCase().trim();
    return bookingBorrower === myEmpId || bookingBorrower === myName;
  });

  const validOwnBookings = totalOwnBookings.filter(booking => {
    if (!booking.start_date) return false;
    const startDateStr = getSafeDateStr(booking.start_date);
    const hasVehicle = !!booking.vehicle_id;
    if (!hasVehicle && startDateStr > todayStr) return false;
    return true;
  });

  const filteredBookings = validOwnBookings
    .filter(booking => {
      const endDateStr = getSafeDateStr(booking.end_date);
      const isCancelled = booking.status === 'cancelled';
      const isReturned = booking.status === 'returned' || booking.status === 'late_returned';
      const isVehicleDeleted = !booking.vehicle_id;

      if (activeSubTab === "current") {
        return !isCancelled && !isReturned && !isVehicleDeleted;
      } else {
        const isWithin3Months = endDateStr >= ninetyDaysAgoStr;
        return (isCancelled || isReturned || isVehicleDeleted) && isWithin3Months;
      }
    })
    .sort((a, b) => {
      if (b.id && a.id) return Number(b.id) - Number(a.id);
      return new Date(b.start_date) - new Date(a.start_date);
    });

  return (
    <MainLayout
      activePage="bookings"
      onNavigate={onNavigate}
      title="รายการจองของฉัน"
      subtitle="รายการคำขอใช้สิทธิ์รถยนต์และประวัติใช้งานย้อนหลังส่วนบุคคล"
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
          <span className="mybk-tab-count">
            {validOwnBookings.filter(b => b.status === 'active' && !!b.vehicle_id).length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("history")}
          className={`mybk-tab ${activeSubTab === "history" ? "is-active" : ""}`}
        >
          <History size={16} /> ประวัติการจองย้อนหลัง
          <span className="mybk-tab-count">
            {validOwnBookings.filter(b => (b.status === 'cancelled' || b.status === 'returned' || b.status === 'late_returned' || !b.vehicle_id) && getSafeDateStr(b.end_date) >= ninetyDaysAgoStr).length}
          </span>
        </button>
      </div>

      <div className="mybk-list">
        {filteredBookings.length === 0 ? (
          <div className="mybk-empty">
            {activeSubTab === "current" ? "ไม่มีรายการจองรถยนต์ที่กำลังเปิดใช้งานอยู่ในขณะนี้" : "ยังไม่มีประวัติการใช้งานรถยนต์ย้อนหลังในช่วง 3 เดือนที่ผ่านมา"}
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const hasStart = booking.start_mileage !== null && booking.start_mileage !== undefined;
            const hasReturn = booking.returned_mileage !== null && booking.returned_mileage !== undefined;
            const distanceUsed = (hasStart && hasReturn) ? (Number(booking.returned_mileage) - Number(booking.start_mileage)) : null;

            const isExpiredUnreturned = getSafeDateStr(booking.end_date) < todayStr && booking.status === 'active';

            return (
              <div key={booking.id} className="mybk-card" style={isExpiredUnreturned ? { borderLeft: "4px solid #DC2626", backgroundColor: "#FEF2F2" } : {}}>
                <div style={{ flex: 1, minWidth: "250px" }}>
                  <h4 className="mybk-card-title">
                    <Tag size={16} className="icon-gold" /> {booking.vehicle_model}

                    {!booking.vehicle_id && (
                      <span className="mybk-badge is-done" style={{ backgroundColor: "#F3F4F6", color: "#4B5563" }}>ไม่พบข้อมูลรถ</span>
                    )}
                    {booking.status === 'cancelled' && (
                      <span className="mybk-badge is-cancelled"> ยกเลิกการจอง</span>
                    )}
                    {booking.status === 'returned' && (
                      <span className="mybk-badge is-done" style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}>คืนรถเรียบร้อย</span>
                    )}
                    {booking.status === 'late_returned' && (
                      <span className="mybk-badge is-cancelled" style={{ backgroundColor: "#fafa88", color: "#af9e05d8" }}>คืนรถล่าช้า</span>
                    )}
                    {isExpiredUnreturned && (
                      <span className="mybk-badge is-cancelled" style={{ backgroundColor: "#DC2626", color: "#FFFFFF" }}>เกินกำหนดคืนรถ</span>
                    )}
                  </h4>

                  <div className="mybk-borrower">
                    ผู้จองรถ: {booking.borrower_real_name || currentUser}
                  </div>

                  {booking.destination && (
                    <div style={{ fontSize: "13px", color: "#4B5563", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={14} style={{ color: "#D97706" }} /> งานโครงการ: <strong>{booking.destination}</strong>
                    </div>
                  )}

                  {(hasStart || hasReturn) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "6px", backgroundColor: "#F9FAFB", padding: "6px 10px", borderRadius: "6px", border: "1px solid #E5E7EB", width: "fit-content", fontSize: "12px" }}>
                      {hasStart && (
                        <span style={{ color: "#4B5563" }}>
                          เลขไมล์ก่อนใช้งาน: <strong style={{ color: "#111827" }}>{Number(booking.start_mileage).toLocaleString()}</strong> ไมล์
                        </span>
                      )}
                      {hasReturn && (
                        <span style={{ color: "#065F46" }}>
                          เลขไมล์หลังใช้งาน: <strong style={{ color: "#059669" }}>{Number(booking.returned_mileage).toLocaleString()}</strong> ไมล์
                        </span>
                      )}
                      {distanceUsed !== null && (
                        <span style={{ color: "#B45309", fontWeight: "700" }}>
                          (ใช้ไป {distanceUsed.toLocaleString()} ไมล์)
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mybk-meta-row" style={{ marginTop: "8px" }}>
                    <span><Calendar size={14} /> เริ่มต้น: {formatDate(booking.start_date)}</span>
                    <span style={isExpiredUnreturned ? { color: "#DC2626", fontWeight: "700" } : {}}><Clock size={14} /> สิ้นสุด: {formatDate(booking.end_date)} {isExpiredUnreturned ? "(เลยกำหนดแล้ว)" : ""}</span>
                    <span><KeyRound size={14} /> รหัสคิว: BOOK-{booking.id}</span>
                  </div>
                </div>

                <div className="mybk-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button type="button" onClick={() => handleOpenDetails(booking)} className="mybk-btn is-view">
                    <Eye size={14} /> รายละเอียด
                  </button>

                  {/* ปุ่มคืนรถ */}
                  {activeSubTab === "current" && booking.status === 'active' && !!booking.vehicle_id && (
                    <button
                      type="button"
                      onClick={() => handleOpenReturnModal(booking)}
                      style={{ 
                        padding: "8px 14px", 
                        backgroundColor: isExpiredUnreturned ? "#DC2626" : "#059669", 
                        color: "#fff", 
                        border: "none", 
                        borderRadius: "8px", 
                        fontWeight: "700", 
                        cursor: "pointer", 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "6px", 
                        fontSize: "13px" 
                      }}
                    >
                      <RotateCcw size={14} /> {isExpiredUnreturned ? "คืนรถ (เกินกำหนด)" : "คืนรถ"}
                    </button>
                  )}

                  {/* ปุ่มยกเลิก */}
                  {activeSubTab === "current" && booking.status === 'active' && !isExpiredUnreturned && !!booking.vehicle_id && (
                    <button type="button" onClick={() => handleRequestCancel(booking.id, booking.vehicle_model)} className="mybk-btn is-cancel">
                      <Trash2 size={14} /> ยกเลิก
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 🟢 MODAL คืนรถและกรอกเลขไมล์ */}
      {returnTarget && (() => {
        const isLateReturn = getSafeDateStr(returnTarget.end_date) < todayStr;
        const currentBase = Number(returnTarget.liveStartMileage ?? returnTarget.start_mileage ?? 0);

        return (
          <div className="modal-overlay" onClick={() => setReturnTarget(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, backdropFilter: "blur(4px)" }}>
            <div className="fg-rise" style={{ maxWidth: "420px", width: "90%", backgroundColor: "#fff", padding: "28px", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: isLateReturn ? "#991B1B" : "#065f46", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Gauge size={22} style={{ color: isLateReturn ? "#DC2626" : "#059669" }} /> 
                  {isLateReturn ? "ทำรายการคืนรถยนต์ (ล่าช้า)" : "ทำรายการคืนรถยนต์"}
                </h3>
                <button type="button" onClick={() => setReturnTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X size={20} /></button>
              </div>

              {isLateReturn ? (
                <div style={{ backgroundColor: "#FEF2F2", padding: "10px 12px", borderRadius: "8px", border: "1px solid #FCA5A5", marginBottom: "14px", fontSize: "13px", color: "#991B1B", display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>รายการนี้เกินกำหนดสิ้นสุด ({formatDate(returnTarget.end_date)}) เมื่อกดคืนแล้ว ระบบจะบันทึกสถานะเป็น <strong>"คืนรถล่าช้า"</strong></span>
                </div>
              ) : (
                <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#4b5563" }}>
                  กรุณากรอกเลขไมล์หลังใช้งานของรถยนต์ <br /><strong style={{ color: "#111827" }}>[{returnTarget.vehicle_model}]</strong> 
                </p>
              )}

              <form onSubmit={executeReturnCar}>
                <div style={{ backgroundColor: "#F0FDF4", padding: "12px", borderRadius: "8px", border: "1px solid #BBF7D0", marginBottom: "16px", fontSize: "13px", color: "#166534" }}>
                  เลขไมล์ก่อนใช้งาน: <strong>{Number(currentBase).toLocaleString()}</strong> 
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#374151", marginBottom: "6px" }}>
                    เลขไมล์หลังใช้งาน
                  </label>
                  <input
                    type="number"
                    placeholder="เช่น 125400"
                    value={inputMileage}
                    onChange={(e) => setInputMileage(e.target.value)}
                    required
                    min={currentBase}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "16px", fontWeight: "600", outline: "none", boxSizing: "border-box" }}
                  />
                  {mileageError && (
                    <div style={{ color: "#DC2626", fontSize: "12px", marginTop: "6px", fontWeight: "600" }}>{mileageError}</div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={() => setReturnTarget(null)} style={{ flex: 1, padding: "12px", backgroundColor: "#f3f4f6", color: "#374151", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}>
                    ปิดหน้าต่าง
                  </button>
                  <button type="submit" style={{ flex: 1, padding: "12px", backgroundColor: isLateReturn ? "#DC2626" : "#059669", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px", boxShadow: isLateReturn ? "0 4px 12px rgba(220, 38, 38, 0.3)" : "0 4px 12px rgba(5, 150, 105, 0.3)" }}>
                    ยืนยันการคืนรถ
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL ยืนยันยกเลิก */}
      {cancelConfirmTarget && (
        <div className="modal-overlay" onClick={() => setCancelConfirmTarget(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, backdropFilter: "blur(4px)" }}>
          <div className="fg-rise" style={{ maxWidth: "420px", width: "90%", backgroundColor: "#fff", padding: "28px", borderRadius: "16px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", margin: "0 auto 16px auto" }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "19px", fontWeight: "800", color: "#991b1b" }}>ยืนยันยกเลิกการจอง?</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "#4b5563" }}>
              คุณต้องการยกเลิกการจองรถยนต์ <br /> <strong style={{ color: "#111827" }}>[{cancelConfirmTarget.modelName}]</strong> ใช่หรือไม่?
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" onClick={() => setCancelConfirmTarget(null)} style={{ flex: 1, padding: "10px", backgroundColor: "#f3f4f6", color: "#374151", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}>
                ยกเลิก
              </button>
              <button type="button" onClick={executeCancelBooking} style={{ flex: 1, padding: "10px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px" }}>
                ยืนยันการยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ทำรายการสำเร็จ */}
      {actionSuccessMessage && (
        <div className="modal-overlay" onClick={() => setActionSuccessMessage(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, backdropFilter: "blur(4px)" }}>
          <div className="fg-rise" style={{ maxWidth: "400px", width: "90%", backgroundColor: "#fff", padding: "28px", borderRadius: "16px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a", margin: "0 auto 16px auto" }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "800", color: "#15803d" }}>ทำรายการสำเร็จ</h3>
            <p style={{ margin: "0 0 24px 0", fontSize: "14px", color: "#4b5563" }}>{actionSuccessMessage}</p>
            <button type="button" onClick={() => setActionSuccessMessage(null)} style={{ width: "100%", padding: "12px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* POPUP รายละเอียดการจอง */}
      {isModalOpen && selectedBooking && (() => {
        const hasStart = selectedBooking.start_mileage !== null && selectedBooking.start_mileage !== undefined;
        const hasReturn = selectedBooking.returned_mileage !== null && selectedBooking.returned_mileage !== undefined;
        const distanceUsed = (hasStart && hasReturn) ? (Number(selectedBooking.returned_mileage) - Number(selectedBooking.start_mileage)) : null;

        return (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div className="booking-modal fg-rise" style={{ maxWidth: "480px", width: "90%", backgroundColor: "#fff", padding: "20px", borderRadius: "12px" }} onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>รายละเอียดการจองรถยนต์</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="close-btn"><X size={20} /></button>
              </div>
              <div className="modal-body">
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div onClick={() => setZoomedImage(selectedBooking.image)} style={{ width: "100%", aspectRatio: "16 / 10", borderRadius: "8px", overflow: "hidden", border: "1px solid #E5E7EB", position: "relative", cursor: "pointer" }}>
                    <img src={selectedBooking.image} alt={selectedBooking.vehicle_model} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div>
                    <h3 className="mybk-detail-title">{selectedBooking.vehicle_model}</h3>
                    <p className="mybk-detail-row"><strong>รหัสคิวการจอง:</strong> BOOK-{selectedBooking.id}</p>
                    <p className="mybk-detail-row"><strong>ผู้ขอใช้สิทธิ์:</strong> {selectedBooking.borrower_real_name || currentUser}</p>
                    {selectedBooking.destination && (
                      <p className="mybk-detail-row"><strong>งานโครงการ:</strong> {selectedBooking.destination}</p>
                    )}

                    <div style={{ margin: "12px 0", padding: "12px", backgroundColor: "#F3F4F6", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#4B5563" }}> เลขไมล์ก่อนใช้งาน:</span>
                        <strong>{hasStart ? `${Number(selectedBooking.start_mileage).toLocaleString()} ไมล์` : "-"}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#4B5563" }}>เลขไมล์หลังใช้งาน:</span>
                        <strong style={{ color: hasReturn ? "#059669" : "#6B7280" }}>{hasReturn ? `${Number(selectedBooking.returned_mileage).toLocaleString()} ไมล์` : "ยังไม่ได้คืนรถ"}</strong>
                      </div>
                      {distanceUsed !== null && (
                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E5E7EB", paddingTop: "6px", marginTop: "2px" }}>
                          <span style={{ color: "#111827", fontWeight: "700" }}>เลขไมล์ที่ใช้งาน:</span>
                          <strong style={{ color: "#D97706", fontSize: "14px" }}>{distanceUsed.toLocaleString()} ไมล์</strong>
                        </div>
                      )}
                    </div>

                    <p className="mybk-detail-row"><strong>กำหนดวันเริ่มต้นคิว:</strong> {formatDate(selectedBooking.start_date)}</p>
                    <p className="mybk-detail-row"><strong>กำหนดวันสิ้นสุดคิว:</strong> {formatDate(selectedBooking.end_date)}</p>
                    <p className="mybk-detail-row">
                      <strong>สถานะ: </strong>
                      {selectedBooking.status === 'returned' && <span style={{ color: "#16A34A", fontWeight: "700" }}>คืนรถเรียบร้อยตามกำหนด</span>}
                      {selectedBooking.status === 'late_returned' && <span style={{ color: "#DC2626", fontWeight: "700" }}>คืนรถล่าช้ากว่ากำหนด</span>}
                      {selectedBooking.status === 'cancelled' && <span style={{ color: "#6B7280" }}>ยกเลิกการจอง</span>}
                      {selectedBooking.status === 'active' && <span style={{ color: "#16A34A", fontWeight: "700" }}>กำลังใช้งาน</span>}
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-dark" style={{ width: "100%" }}>ปิดหน้าต่างรายละเอียด</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* LIGHTBOX POPUP */}
      {zoomedImage && (
        <div onClick={() => setZoomedImage(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, cursor: "zoom-out" }}>
          <button type="button" onClick={() => setZoomedImage(null)} style={{ position: "absolute", top: "20px", right: "24px", background: "none", border: "none", color: "#fff", cursor: "pointer" }}><X size={32} /></button>
          <div style={{ maxWidth: "90%", maxHeight: "85%", borderRadius: "8px", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <img src={zoomedImage} alt="Zoomed" style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} />
          </div>
        </div>
      )}
    </MainLayout>
  );
}