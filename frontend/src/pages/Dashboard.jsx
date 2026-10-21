import { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import VehicleCard from "../components/VehicleCard";
import { X, User, Eye, Maximize2, AlertTriangle, ChevronLeft, ChevronRight, ArrowRight, PhoneCall, Calendar, AlertCircle, CheckCircle, MapPin, Gauge } from "lucide-react";
import "../styles/vehicle.css";

export default function Dashboard({ onNavigate }) {
  const API_BASE = `http://${window.location.hostname}:5000/api`;

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600";
    if (imagePath.startsWith("http")) return imagePath;
    return `http://${window.location.hostname}:5000${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
  };

  const [currentUser, setCurrentUser] = useState(localStorage.getItem("borrowerName") || "พนักงานทั่วไป");
  const userRole = localStorage.getItem("userRole") || "employee";
  const borrowerEmpId = localStorage.getItem("borrowerEmpId");
  const isAdmin = userRole.trim().toLowerCase() === "admin";

  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [modalMode, setModalMode] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [destination, setDestination] = useState("");

  const [zoomedImage, setZoomedImage] = useState(null);

  const [conflictBooking, setConflictBooking] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState(null);

  const todayStr = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  useEffect(() => {
    fetchData();
    fetchLatestUserProfile();
  }, []);

  async function fetchLatestUserProfile() {
    if (!borrowerEmpId) return;
    try {
      const res = await fetch(`${API_BASE}/employees`);
      if (res.ok) {
        const employeesList = await res.json();
        setEmployees(employeesList);
        const me = employeesList.find(emp => emp.id?.toString().trim().toUpperCase() === borrowerEmpId.toString().trim().toUpperCase());
        if (me && me.name) {
          setCurrentUser(me.name);
          localStorage.setItem("borrowerName", me.name);
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }

  async function fetchData() {
    try {
      const resVehicles = await fetch(`${API_BASE}/vehicles`);
      if (!resVehicles.ok) throw new Error("ดึงข้อมูลรถไม่สำเร็จ");
      const dataVehicles = await resVehicles.json();

      const formattedVehicles = Array.isArray(dataVehicles) ? dataVehicles.map(v => ({
        ...v,
        image: getImageUrl(v.image),
        mileage: v.mileage || 0
      })) : [];

      setVehicles(formattedVehicles);

      const resBookings = await fetch(`${API_BASE}/bookings`);
      if (!resBookings.ok) throw new Error("ดึงข้อมูลคิวจองไม่สำเร็จ");
      const dataBookings = await resBookings.json();

      if (Array.isArray(dataBookings)) {
        const formatDateToLocal = (dateStr) => {
          if (!dateStr) return "";
          const d = new Date(dateStr);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const formattedBookings = dataBookings.map(b => ({
          id: b.id,
          vehicleId: b.vehicle_id || b.vehicleId,
          vehicleModel: b.vehicle_model || b.vehicleModel,
          startDate: formatDateToLocal(b.start_date),
          endDate: formatDateToLocal(b.end_date),
          borrower: b.borrower,
          borrowerRealName: b.borrower_real_name || b.borrower,
          destination: b.destination,
          status: b.status
        }));
        setBookings(formattedBookings);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", err);
      setVehicles([]);
      setBookings([]);
    }
  }

  function getActWarning(expiryDateStr) {
    if (!expiryDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 90) {
      return diffDays <= 0 ? "พ.ร.บ. หมดอายุแล้ว! กรุณาต่อด่วน" : `พ.ร.บ. ใกล้หมดอายุในอีก ${diffDays} วัน`;
    }
    return null;
  }

  // 🟢 ตรวจสอบสถานะว่าติดจองในวันนี้หรือไม่
  function isCarBookedToday(vehicleId) {
    return bookings.some(b => {
      if (b.vehicleId !== vehicleId) return false;
      if (b.status === 'cancelled' || b.status === 'returned' || b.status === 'late_returned') return false;
      
      const isInDateRange = todayStr >= b.startDate && todayStr <= b.endDate;
      const isOverdueHolding = todayStr > b.endDate && b.status === 'active';

      return isInDateRange || isOverdueHolding;
    });
  }

  function handleView(vehicle) {
    const currentCar = vehicles.find(c => c.id === vehicle.id) || vehicle;
    setSelectedVehicle(currentCar);
    setModalMode("view");
  }

  function handleSelect(vehicle) {
    const currentCar = vehicles.find(c => c.id === vehicle.id) || vehicle;
    setSelectedVehicle(currentCar);
    setModalMode("booking");
    setStartDate("");
    setEndDate("");
    setDestination("");
  }

  async function handleConfirmBooking(e) {
    e.preventDefault();
    if (!startDate || !endDate) {
      setBookingError("กรุณาระบุวันเวลาจองให้ครบถ้วน");
      return;
    }

    if (startDate < todayStr) {
      setBookingError("ข้อผิดพลาด: ไม่สามารถจองย้อนหลังได้ (วันที่เริ่มต้นต้องเป็นวันนี้หรืออนาคต)");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setBookingError("ข้อผิดพลาด: วันเริ่มต้นจองรถต้องไม่เลยวันสิ้นสุดการจอง");
      return;
    }

    if (!destination.trim()) {
      setBookingError("กรุณาระบุงานโครงการ / สถานที่จะไป");
      return;
    }

    // ตรวจสอบกรณีค้างส่งคืน (เลยกำหนดแล้วยังไม่กดคืน)
    const overdueHolding = bookings.find((booking) => {
      if (booking.vehicleId !== selectedVehicle.id) return false;
      if (booking.status !== 'active') return false;
      return todayStr > booking.endDate;
    });

    if (overdueHolding) {
      const matchEmp = employees.find(emp => emp.id?.toString().toLowerCase().trim() === overdueHolding.borrower?.toString().toLowerCase().trim());
      setConflictBooking({
        ...overdueHolding,
        borrowerName: overdueHolding.borrowerRealName || (matchEmp ? matchEmp.name : overdueHolding.borrower),
        dept: matchEmp ? matchEmp.dept : "ไม่ระบุแผนก",
        isHoldingOverdue: true
      });
      return;
    }

    // ตรวจสอบคิวติดจองตามช่วงวันที่ปกติ
    const existingConflict = bookings.find((booking) => {
      if (booking.vehicleId !== selectedVehicle.id) return false;
      if (booking.status !== 'active') return false;
      return startDate <= booking.endDate && endDate >= booking.startDate;
    });

    if (existingConflict) {
      const matchEmp = employees.find(emp => emp.id?.toString().toLowerCase().trim() === existingConflict.borrower?.toString().toLowerCase().trim());
      setConflictBooking({
        ...existingConflict,
        borrowerName: existingConflict.borrowerRealName || (matchEmp ? matchEmp.name : existingConflict.borrower),
        dept: matchEmp ? matchEmp.dept : "ไม่ระบุแผนก",
        isHoldingOverdue: false
      });
      return;
    }

    const currentEmpId = localStorage.getItem("borrowerEmpId");
    const myEmpInfo = employees.find(emp => emp.id?.toString().toLowerCase().trim() === currentEmpId?.toString().toLowerCase().trim());
    const userDept = myEmpInfo ? myEmpInfo.dept : (localStorage.getItem("userDept") || "");

    try {
      const response = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: selectedVehicle.id,
          vehicle_model: selectedVehicle.model,
          start_date: startDate,
          end_date: endDate,
          destination: destination.trim(),
          borrower: currentEmpId || localStorage.getItem("borrowerName") || "ADMIN",
          dept: userDept
        })
      });

      const resData = await response.json();

      if (response.ok) {
        setBookingSuccess(selectedVehicle.model);
        setModalMode(null);
        setSelectedVehicle(null);
        setStartDate("");
        setEndDate("");
        setDestination("");
        fetchData();
      } else {
        setBookingError(resData.message || "เซิร์ฟเวอร์หลังบ้านบันทึกไม่สำเร็จ");
      }
    } catch (err) {
      setBookingError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์หลังบ้าน");
    }
  }

  const availableCount = vehicles.filter(v => v.status !== "maintenance").length;
  const maintenanceCount = vehicles.filter(v => v.status === "maintenance").length;

  // 🟢 คำนวณจำนวนรถที่พร้อมและว่างสำหรับจองวันนี้จริง
  const availableTodayCount = vehicles.filter(v => {
    if (v.status === "maintenance") return false;
    return !isCarBookedToday(v.id);
  }).length;

  function goToVehicle(direction) {
    if (!selectedVehicle || vehicles.length < 2) return;
    const idx = vehicles.findIndex(v => v.id === selectedVehicle.id);
    if (idx === -1) return;
    const nextIdx = (idx + direction + vehicles.length) % vehicles.length;
    setSelectedVehicle(vehicles[nextIdx]);
    setStartDate("");
    setEndDate("");
    setDestination("");
  }

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${parseInt(d)}/${parseInt(m)}/${parseInt(y) + 543}`;
  };

  return (
    <MainLayout
      activePage="dashboard"
      onNavigate={onNavigate}
      title="รถยนต์ทั้งหมด"
      subtitle="เลือกรถยนต์สำหรับการจองของคุณ"
    >
      {/* ==================== HERO BANNER ==================== */}
      <div className="hero-banner-v2">
        <div className="hero-photo-side">
          <div className="hero-photo-top">
            <div className="hero-brand-mark">
              <span className="hero-brand-gem" />
              System Prime
            </div>
          </div>
          <div className="hero-photo-bottom">
            <h2 className="hero-welcome">
              ยินดีต้อนรับ <strong>{currentUser}</strong>
            </h2>
          </div>
        </div>

        <div className="hero-stats-side">
          <div className="hero-stats-header">ข้อมูลการทำรายการ</div>
          <div className="hero-stat-row">
            <span className="hero-stat-gem" />
            <div>
              <div className="hero-stat-num">{vehicles.length}</div>
              <div className="hero-stat-lbl">รถยนต์ทั้งหมด</div>
            </div>
          </div>
          <div className="hero-stat-row">
            <span className="hero-stat-gem" />
            <div>
              <div className="hero-stat-num">{availableCount}</div>
              <div className="hero-stat-lbl">รถยนต์ที่พร้อมใช้งาน</div>
            </div>
          </div>
          <div className={`hero-stat-row ${maintenanceCount > 0 ? "warn" : ""}`}>
            <span className="hero-stat-gem" />
            <div>
              <div className="hero-stat-num">{maintenanceCount}</div>
              <div className="hero-stat-lbl">รถยนต์ที่ซ่อมบำรุง</div>
            </div>
          </div>

          {/* 🟢 แสดงตัวเลขรถยนต์ที่ว่างวันนี้จริง */}
          <div className="hero-stat-row">
            <span className="hero-stat-gem" />
            <div>
              <div className="hero-stat-num">{availableTodayCount}</div>
              <div className="hero-stat-lbl">รถยนต์ที่ว่าง</div>
            </div>
          </div>

          <div className="hero-stats-footer">
            <button type="button" className="hero-stats-link" onClick={() => onNavigate("traffic")}>
              ดูปฏิทินการจอง <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== GRID รายการรถ ==================== */}
      <div className="vehicle-grid">
        {vehicles.map((vehicle) => {
          const actWarning = getActWarning(vehicle.act_expiry_date);
          const bookedToday = isCarBookedToday(vehicle.id);
          const isMaintenance = vehicle.status === "maintenance";

          return (
            <div 
              key={vehicle.id} 
              style={{ 
                position: "relative", 
                overflow: "hidden", 
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                border: "1px solid #f3f4f6"
              }}
            >
              {/* 🟢 สายคาดเฉียงมุมซ้ายบน */}
              {isMaintenance ? (
                <div style={{
                  position: "absolute",
                  top: "18px",
                  left: "-32px",
                  width: "120px",
                  transform: "rotate(-45deg)",
                  backgroundColor: "#DC2626",
                  color: "#FFFFFF",
                  padding: "5px 0",
                  fontSize: "11px",
                  fontWeight: "800",
                  letterSpacing: "0.5px",
                  boxShadow: "0 2px 8px rgba(220, 38, 38, 0.4)",
                  zIndex: 20,
                  textAlign: "center",
                  pointerEvents: "none"
                }}>
                  ชำรุด
                </div>
              ) : bookedToday ? (
                <div style={{
                  position: "absolute",
                  top: "18px",
                  left: "-32px",
                  width: "120px",
                  transform: "rotate(-45deg)",
                  backgroundColor: "#f5e452",
                  color: "#854d0e",
                  padding: "5px 0",
                  fontSize: "11px",
                  fontWeight: "800",
                  letterSpacing: "0.5px",
                  boxShadow: "0 2px 8px rgba(245, 228, 82, 0.4)",
                  zIndex: 20,
                  textAlign: "center",
                  pointerEvents: "none"
                }}>
                  ติดจอง
                </div>
              ) : (
                <div style={{
                  position: "absolute",
                  top: "18px",
                  left: "-32px",
                  width: "120px",
                  transform: "rotate(-45deg)",
                  backgroundColor: "#10B981",
                  color: "#FFFFFF",
                  padding: "5px 0",
                  fontSize: "11px",
                  fontWeight: "800",
                  letterSpacing: "0.5px",
                  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)",
                  zIndex: 20,
                  textAlign: "center",
                  pointerEvents: "none"
                }}>
                  ว่าง
                </div>
              )}

              {isAdmin && actWarning && (
                <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 30, backgroundColor: "#EF4444", color: "#fff", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                  <AlertTriangle size={13} /> {actWarning}
                </div>
              )}

              <VehicleCard
                vehicle={vehicle}
                onView={handleView}
                onSelect={handleSelect}
                onRefreshData={fetchData}
              />
            </div>
          );
        })}
      </div>

      {/* ==================== VIEW MODAL ==================== */}
      {modalMode === "view" && selectedVehicle && (
        <div className="modal-overlay" onClick={() => setModalMode(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="booking-modal fg-rise" style={{ maxWidth: "480px", width: "90%", backgroundColor: "#fff", padding: "20px", borderRadius: "12px" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", margin: 0, fontWeight: "700" }}><Eye size={18} style={{ verticalAlign: "middle", marginRight: "6px" }} /> รายละเอียดข้อมูลรถยนต์</h2>
              <button type="button" className="close-btn" onClick={() => setModalMode(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-vehicle-detailed-panel">
                <div onClick={() => setZoomedImage(selectedVehicle.image)} style={{ width: "100%", aspectRatio: "16 / 10", borderRadius: "12px", overflow: "hidden", border: "1px solid #e5e7eb", position: "relative", cursor: "pointer" }}>
                  <img src={selectedVehicle.image} alt={selectedVehicle.model} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ marginTop: "16px" }}>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "18px" }}>{selectedVehicle.model}</h3>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ padding: "6px 12px", backgroundColor: "#f3f4f6", borderRadius: "6px", fontSize: "13px", fontWeight: "600" }}>ทะเบียน: {selectedVehicle.plate}</span>
                    <span style={{ padding: "6px 12px", backgroundColor: "#f3f4f6", borderRadius: "6px", fontSize: "13px", fontWeight: "600" }}>ความจุ: {selectedVehicle.seats} ที่นั่ง</span>
                    <span style={{ padding: "6px 12px", backgroundColor: "#FEF3C7", color: "#92400E", borderRadius: "6px", fontSize: "13px", fontWeight: "700" }}>เลขไมล์ที่ใช้งาน: {Number(selectedVehicle.mileage || 0).toLocaleString()} ไมล์</span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="btn-dark" onClick={() => setModalMode(null)}>ปิดหน้าต่าง</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BOOKING MODAL ==================== */}
      {modalMode === "booking" && selectedVehicle && (() => {
        const actWarning = getActWarning(selectedVehicle.act_expiry_date);
        return (
          <div className="booking-fullscreen-overlay" onClick={() => setModalMode(null)}>
            <div className="booking-split-card fg-rise" onClick={e => e.stopPropagation()}>
              <div className="booking-panel-image" style={{ backgroundImage: `url(${selectedVehicle.image})` }}>
                <div className="booking-image-topbar">
                  <div className="booking-brand"><span className="booking-brand-mark" /> System Prime · Fleet</div>
                  <div className="booking-image-caption">ระบบจองรถยนต์ส่วนกลาง</div>
                </div>
                <div className="booking-image-bottom">
                  <div className="booking-model-name">{selectedVehicle.model}</div>
                  <div className="booking-model-big-stat">{selectedVehicle.seats}<span>ที่นั่ง</span></div>
                </div>
              </div>

              <div className="booking-panel-dark">
                <button type="button" className="booking-panel-close" onClick={() => setModalMode(null)}><X size={20} /></button>
                <div className="booking-title-row">
                  <div>
                    <div className="booking-title-label">ทะเบียนรถ</div>
                    <div className="booking-title-value">{selectedVehicle.plate}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="booking-title-label">ผู้จอง</div>
                    <div className="booking-title-value gold">{currentUser}</div>
                  </div>
                </div>

                <form onSubmit={handleConfirmBooking}>
                  <div style={{ backgroundColor: "rgba(217, 119, 6, 0.15)", border: "1px solid rgba(217, 119, 6, 0.4)", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px", color: "#FBBF24", fontSize: "13px" }}>
                    <Gauge size={16} /> เลขไมล์ที่ใช้งาน: <strong>{Number(selectedVehicle.mileage || 0).toLocaleString()} ไมล์</strong>
                  </div>

                  <div className="booking-form-dark">
                    <div className="booking-field">
                      <label>วันที่เริ่มต้น</label>
                      <input 
                        type="date" 
                        value={startDate} 
                        min={todayStr} 
                        onChange={(e) => setStartDate(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="booking-field">
                      <label>วันที่สิ้นสุด</label>
                      <input 
                        type="date" 
                        value={endDate} 
                        min={startDate || todayStr} 
                        onChange={(e) => setEndDate(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>

                  <div className="booking-field" style={{ marginTop: "12px", marginBottom: "16px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <MapPin size={14} style={{ color: "var(--gold-deep)" }} /> งานโครงการ 
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ไซต์งานชลบุรี, ส่งเอกสารสำนักงานใหญ่"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      required
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", backgroundColor: "rgba(0,0,0,0.3)", color: "#fff", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  <div className="booking-actions-row">
                    <button type="button" className="btn-outline-gold" onClick={() => setModalMode(null)}>ยกเลิก</button>
                    <button type="submit" className="btn-gold">ยืนยันการจอง</button>
                  </div>
                </form>

                <div className="booking-footer-nav" style={{ marginTop: "16px" }}>
                  <div className="booking-nav-arrows">
                    <button type="button" className="booking-icon-btn" onClick={() => goToVehicle(-1)} disabled={vehicles.length < 2}><ChevronLeft size={18} /></button>
                    <button type="button" className="booking-icon-btn" onClick={() => goToVehicle(1)} disabled={vehicles.length < 2}><ChevronRight size={18} /></button>
                  </div>
                  <button type="button" className="booking-icon-btn" onClick={() => setZoomedImage(selectedVehicle.image)}><Maximize2 size={16} /></button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🔴 POPUP แจ้งเตือนเมื่อมีคนติดจองอยู่แล้ว / หรือค้างส่งคืน */}
      {conflictBooking && (
        <div 
          className="modal-overlay" 
          onClick={() => setConflictBooking(null)} 
          style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: "rgba(0,0,0,0.65)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            zIndex: 3000, 
            backdropFilter: "blur(4px)" 
          }}
        >
          <div 
            className="fg-rise" 
            style={{ 
              maxWidth: "430px", 
              width: "90%", 
              backgroundColor: "#fff", 
              padding: "24px", 
              borderRadius: "16px", 
              border: "1px solid #fee2e2", 
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" 
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", backgroundColor: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", margin: "0 auto 12px auto" }}>
                <AlertCircle size={28} />
              </div>
              <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "800", color: "#991b1b" }}>
                {conflictBooking.isHoldingOverdue ? "รถยนต์ยังไม่ถูกส่งคืนเข้าสู่ระบบ" : "ไม่สามารถจองรถยนต์ได้"}
              </h3>
              <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#6b7280" }}>
                {conflictBooking.isHoldingOverdue 
                  ? "ผู้ใช้งานคนก่อนหน้ายังไม่ได้ทำการกดส่งคืนรถ" 
                  : "ช่วงวันที่คุณระบุตรงกับคิวที่มีผู้ใช้งานอื่นทำการจองไว้แล้ว"}
              </p>
            </div>

            <div style={{ backgroundColor: "#f9fafb", padding: "14px", borderRadius: "12px", border: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", color: "#111827", fontWeight: "700", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" }}>
                <User size={16} style={{ color: "#d97706", flexShrink: 0 }} /> 
                <span>ผู้ใช้รถ: <strong style={{ color: "#b45309" }}>{conflictBooking.borrowerName}</strong></span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#374151" }}>
                <PhoneCall size={15} style={{ color: "#2563eb", flexShrink: 0 }} /> 
                <span>แผนก: <strong style={{ color: "#1d4ed8" }}>{conflictBooking.dept || "ไม่ระบุแผนก"}</strong> (รหัส: {conflictBooking.borrower})</span>
              </div>

              {conflictBooking.destination && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#374151" }}>
                  <MapPin size={15} style={{ color: "#dc2626", flexShrink: 0 }} /> 
                  <span>งานโครงการ: <strong style={{ color: "#991b1b" }}>{conflictBooking.destination}</strong></span>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#374151" }}>
                <Calendar size={15} style={{ color: "#059669", flexShrink: 0 }} /> 
                <span>
                  {conflictBooking.isHoldingOverdue ? "กำหนดเดิมที่ต้องคืน:" : "ช่วงวันที่ติดจอง:"}{" "}
                  <strong style={{ color: conflictBooking.isHoldingOverdue ? "#dc2626" : "#047857" }}>
                    {formatDateDisplay(conflictBooking.startDate)} - {formatDateDisplay(conflictBooking.endDate)}
                    {conflictBooking.isHoldingOverdue ? " " : ""}
                  </strong>
                </span>
              </div>
            </div>

            <button 
              type="button" 
              onClick={() => setConflictBooking(null)} 
              style={{ width: "100%", padding: "10px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px", boxShadow: "0 4px 12px rgba(220, 38, 38, 0.25)" }}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* POPUP BOOKING SUCCESS */}
      {bookingSuccess && (
        <div className="modal-overlay" onClick={() => { setBookingSuccess(null); onNavigate("bookings"); }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, backdropFilter: "blur(4px)" }}>
          <div className="fg-rise" style={{ maxWidth: "400px", width: "90%", backgroundColor: "#fff", padding: "28px", borderRadius: "16px", border: "1px solid #dcfce7", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a", margin: "0 auto 16px auto" }}><CheckCircle size={32} /></div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "800", color: "#15803d" }}>บันทึกการจองสำเร็จ!</h3>

            <p style={{ margin: "0 0 24px 0", fontSize: "14.5px", color: "#4b5563", textAlign: "center", lineHeight: "1.7" }}>
              ทำการจองรถยนต์ {bookingSuccess}
              <br />
              สำเร็จแล้ว!
            </p>

            <button type="button" onClick={() => { setBookingSuccess(null); onNavigate("bookings"); }} style={{ width: "100%", padding: "12px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
              ตกลง 
            </button>
          </div>
        </div>
      )}

      {/* POPUP BOOKING ERROR */}
      {bookingError && (
        <div className="modal-overlay" onClick={() => setBookingError(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, backdropFilter: "blur(4px)" }}>
          <div className="fg-rise" style={{ maxWidth: "400px", width: "90%", backgroundColor: "#fff", padding: "28px", borderRadius: "16px", border: "1px solid #fee2e2", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", margin: "0 auto 16px auto" }}><AlertCircle size={32} /></div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "19px", fontWeight: "800", color: "#991b1b" }}>แจ้งเตือนข้อมูลไม่ถูกต้อง</h3>
            <p style={{ margin: "0 0 24px 0", fontSize: "14px", color: "#4b5563" }}>{bookingError}</p>
            <button type="button" onClick={() => setBookingError(null)} style={{ width: "100%", padding: "12px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
              ตกลง 
            </button>
          </div>
        </div>
      )}

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