import { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import VehicleCard from "../components/VehicleCard";
import { X, User, Eye, Maximize2, AlertTriangle, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
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
  
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [modalMode, setModalMode] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [zoomedImage, setZoomedImage] = useState(null);

  useEffect(() => {
    fetchData();
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

  async function fetchData() {
    try {
      const resVehicles = await fetch(`${API_BASE}/vehicles`);
      if (!resVehicles.ok) throw new Error("ดึงข้อมูลรถไม่สำเร็จ");
      const dataVehicles = await resVehicles.json();
      
      const formattedVehicles = Array.isArray(dataVehicles) ? dataVehicles.map(v => ({
        ...v,
        image: getImageUrl(v.image)
      })) : [];
      
      setVehicles(formattedVehicles);

      const resBookings = await fetch(`${API_BASE}/bookings`);
      if (!resBookings.ok) throw new Error("ดึงข้อมูลคิวจองไม่สำเร็จ");
      const dataBookings = await resBookings.json();
      
      if (Array.isArray(dataBookings)) {
        const formattedBookings = dataBookings.map(b => {
          const formatDateToLocal = (dateStr) => {
            if (!dateStr) return "";
            const d = new Date(dateStr);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };

          return {
            id: b.id,
            vehicleId: b.vehicle_id || b.vehicleId, 
            vehicleModel: b.vehicle_model || b.vehicleModel,
            startDate: formatDateToLocal(b.start_date),
            endDate: formatDateToLocal(b.end_date),
            borrower: b.borrower,
            status: b.status,
            color: b.vehicle_id === "v1" ? "#F59E0B" : b.vehicle_id === "v2" ? "#10B981" : b.vehicle_id === "v3" ? "#3B82F6" : "#EC4899"
          };
        });
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
  }

  async function handleConfirmBooking(e) {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert("กรุณาระบุวันเวลาจองให้ครบถ้วน");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert("ข้อผิดพลาด: วันเริ่มต้นจองรถต้องไม่เลยวันสิ้นสุดการจอง");
      return;
    }

    const isOverlapping = bookings.some((booking) => {
      if (booking.vehicleId !== selectedVehicle.id) return false;
      if (booking.status === 'cancelled') return false;
      return startDate <= booking.endDate && endDate >= booking.startDate;
    });

    if (isOverlapping) {
      alert(`ไม่สามารถจองได้: รถยนต์คันนี้ถูกจองแล้ว`);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: selectedVehicle.id,
          vehicleModel: selectedVehicle.model,
          startDate: startDate,
          endDate: endDate,
          borrower: localStorage.getItem("borrowerEmpId") || localStorage.getItem("borrowerName")
        })
      });

      if (response.ok) {
        alert(`ทำการจองรถยนต์ ${selectedVehicle.model} สำเร็จแล้ว!`);
        setModalMode(null);
        setSelectedVehicle(null);
        setStartDate("");
        setEndDate("");
        onNavigate("bookings"); 
      } else {
        alert("เซิร์ฟเวอร์หลังบ้านบันทึกไม่สำเร็จ");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์หลังบ้าน");
    }
  }

  // 🟢 คำนวณวันปัจจุบัน YYYY-MM-DD
  const todayStr = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  // 🟢 คำนวณสถิติเฉพาะคิวจองที่กำลังใช้งานอยู่จริง (ไม่นับคิวที่ยกเลิก และคิวที่หมดอายุแล้ว)
  const activeBookingsCount = bookings.filter(b => {
    if (b.status === "cancelled") return false;
    return b.endDate >= todayStr;
  }).length;

  const availableCount = vehicles.filter(v => v.status !== "maintenance").length;
  const maintenanceCount = vehicles.filter(v => v.status === "maintenance").length;

  function goToVehicle(direction) {
    if (!selectedVehicle || vehicles.length < 2) return;
    const idx = vehicles.findIndex(v => v.id === selectedVehicle.id);
    if (idx === -1) return;
    const nextIdx = (idx + direction + vehicles.length) % vehicles.length;
    setSelectedVehicle(vehicles[nextIdx]);
    setStartDate("");
    setEndDate("");
  }

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

          <div className="hero-stat-row">
            <span className="hero-stat-gem" />
            <div>
              <div className="hero-stat-num">{activeBookingsCount}</div>
              <div className="hero-stat-lbl">รถยนต์ที่ถูกจอง</div>
            </div>
          </div>

          <div className="hero-stats-footer">
            <button type="button" className="hero-stats-link" onClick={() => onNavigate("traffic")}>
              ดูปฏิทินการจอง <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="vehicle-grid">
        {vehicles.map((vehicle) => {
          const actWarning = getActWarning(vehicle.act_expiry_date);

          return (
            <div key={vehicle.id} style={{ position: "relative" }}>
              {isAdmin && actWarning && (
                <div style={{ position: "absolute", top: "10px", left: "10px", right: "10px", zIndex: 10, backgroundColor: "#EF4444", color: "#fff", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                  <AlertTriangle size={15} /> {actWarning}
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
          <div className="booking-modal fg-rise" style={{ maxWidth: "480px", width: "90%", backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", margin: 0, fontWeight: "700", color: "var(--ink)" }}><Eye size={18} style={{ verticalAlign: "middle", marginRight: "6px", color: "var(--gold-deep)" }} /> รายละเอียดข้อมูลรถยนต์</h2>
              <button type="button" className="close-btn" onClick={() => setModalMode(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-vehicle-detailed-panel">
                <div 
                  onClick={() => setZoomedImage(selectedVehicle.image)}
                  title="คลิกเพื่อส่องดูรูปขนาดใหญ่"
                  style={{ width: "100%", aspectRatio: "16 / 10", borderRadius: "12px", overflow: "hidden", border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", position: "relative", cursor: "pointer", display: "flex" }}
                >
                  <img 
                    src={selectedVehicle.image} 
                    alt={selectedVehicle.model} 
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                    onError={(e)=>{e.target.src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600"}} 
                  />
                  <div style={{ position: "absolute", bottom: "10px", right: "10px", backgroundColor: "rgba(0, 0, 0, 0.65)", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", fontWeight: "500" }}>
                    <Maximize2 size={12} /> คลิกขยายรูป
                  </div>
                </div>

                <div className="modal-car-specs-grid" style={{ marginTop: "16px" }}>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", color: "#111827" }}>{selectedVehicle.model}</h3>
                  <div className="spec-tag-group" style={{ display: "flex", gap: "8px" }}>
                    <span className="spec-tag" style={{ padding: "6px 12px", backgroundColor: "#f3f4f6", color: "#374151", borderRadius: "6px", fontSize: "13px", fontWeight: "600" }}>ทะเบียน: {selectedVehicle.plate}</span>
                    <span className="spec-tag" style={{ padding: "6px 12px", backgroundColor: "#f3f4f6", color: "#374151", borderRadius: "6px", fontSize: "13px", fontWeight: "600" }}>ความจุ: {selectedVehicle.seats} ที่นั่ง</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="btn-dark" onClick={() => setModalMode(null)}>ปิดหน้าต่างรายละเอียด</button>
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
              
              <div 
                className="booking-panel-image" 
                style={{ backgroundImage: `url(${selectedVehicle.image})` }}
              >
                <div className="booking-image-topbar">
                  <div className="booking-brand">
                    <span className="booking-brand-mark" />
                    System Prime · Fleet
                  </div>
                  <div className="booking-image-caption">ระบบจองรถยนต์ส่วนกลาง</div>
                </div>
                <div className="booking-image-bottom">
                  <div className="booking-model-name">{selectedVehicle.model}</div>
                  <div className="booking-model-big-stat">
                    {selectedVehicle.seats}<span>ที่นั่ง</span>
                  </div>
                </div>
              </div>

              <div className="booking-panel-dark">
                <button type="button" className="booking-panel-close" onClick={() => setModalMode(null)}>
                  <X size={20} />
                </button>

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
                  <div className="booking-form-dark">
                    <div className="booking-field">
                      <label>วันที่เริ่มต้น</label>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                    </div>
                    <div className="booking-field">
                      <label>วันที่สิ้นสุด</label>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                    </div>
                  </div>

                  <div className="booking-specs-row">
                    <div>
                      <div className="booking-spec-label">ความจุ</div>
                      <div className="booking-spec-value">{selectedVehicle.seats} ที่นั่ง</div>
                    </div>
                    <div>
                      <div className="booking-spec-label">รหัสรถ</div>
                      <div className="booking-spec-value">{selectedVehicle.id}</div>
                    </div>
                    <div>
                      <div className="booking-spec-label">พ.ร.บ.</div>
                      <div className={`booking-spec-value ${actWarning ? "warn" : ""}`}>
                        {actWarning ? <AlertTriangle size={13} /> : null}
                        {actWarning ? "ใกล้ครบกำหนด" : "ปกติ"}
                      </div>
                    </div>
                  </div>

                  <div className="booking-actions-row">
                    <button type="button" className="btn-outline-gold" onClick={() => setModalMode(null)}>ยกเลิก</button>
                    <button type="submit" className="btn-gold">ยืนยันการจอง</button>
                  </div>
                </form>

                <div className="booking-footer-nav">
                  <div className="booking-nav-arrows">
                    <button type="button" className="booking-icon-btn" onClick={() => goToVehicle(-1)} disabled={vehicles.length < 2} title="รถคันก่อนหน้า">
                      <ChevronLeft size={18} />
                    </button>
                    <button type="button" className="booking-icon-btn" onClick={() => goToVehicle(1)} disabled={vehicles.length < 2} title="รถคันถัดไป">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <button type="button" className="booking-icon-btn" onClick={() => setZoomedImage(selectedVehicle.image)} title="ขยายรูป">
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* LIGHTBOX ขยายรูปภาพ */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)} 
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, cursor: "zoom-out" }}
        >
          <button type="button" onClick={() => setZoomedImage(null)} style={{ position: "absolute", top: "20px", right: "24px", background: "none", border: "none", color: "#fff", cursor: "pointer" }}><X size={32} /></button>
          <div style={{ maxWidth: "90%", maxHeight: "85%", borderRadius: "8px", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <img 
              src={zoomedImage} 
              alt="Zoomed Vehicle Layout" 
              style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", display: "block", backgroundColor: "#fff", padding: "6px", borderRadius: "4px" }} 
              onError={(e)=>{e.target.src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600"}}
            />
          </div>
        </div>
      )}

    </MainLayout>
  );
}