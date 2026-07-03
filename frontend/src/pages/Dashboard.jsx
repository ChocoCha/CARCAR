import { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import VehicleCard from "../components/VehicleCard";
import { X, Calendar, User, Clock, CheckCircle, Eye, Maximize2 } from "lucide-react";
import "../styles/vehicle.css";

export default function Dashboard({ onNavigate }) { 
  const [currentUser] = useState(localStorage.getItem("borrowerName") || "พนักงานทั่วไป");
  
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [modalMode, setModalMode] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // 🟢 State สำหรับคุมการเปิดดูรูปภาพขนาดใหญ่พิเศษ (Lightbox แบบ Full Screen)
  const [zoomedImage, setZoomedImage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const resVehicles = await fetch("http://localhost:5000/api/vehicles");
      if (!resVehicles.ok) throw new Error("ดึงข้อมูลรถไม่สำเร็จ");
      const dataVehicles = await resVehicles.json();
      setVehicles(Array.isArray(dataVehicles) ? dataVehicles : []);

      const resBookings = await fetch("http://localhost:5000/api/bookings");
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
      return startDate <= booking.endDate && endDate >= booking.startDate;
    });

    if (isOverlapping) {
      alert(`❌ ไม่สามารถจองได้: รถยนต์คันนี้ถูกจองในช่วงวันที่ระบุแล้ว`);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/bookings", {
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
        alert(`ทำการลงทะเบียนจองรถ ${selectedVehicle.model} สำเร็จแล้ว!`);
        setModalMode(null);
        setSelectedVehicle(null);
        setStartDate("");
        setEndDate("");
        onNavigate("bookings"); 
      } else {
        alert("เซิร์ฟเวอร์หลังบ้านบันทึกไม่สำเร็จ");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการชื่มต่อเซิร์ฟเวอร์หลังบ้าน");
    }
  }

  return (
    <MainLayout 
      activePage="dashboard" 
      onNavigate={onNavigate} 
      title="🚗 ยานพาหนะทั้งหมด" 
      subtitle="เลือกรถยนต์และเลือกสำหรับการจองของคุณ"
    >
      <div className="dashboard-user-banner">
        <div className="user-banner-welcome">
          <User size={18} className="icon-gold" />
          <span>ยินดีต้อนรับผู้ใช้งาน: <strong>{currentUser}</strong></span>
        </div>
      </div>

      <div className="vehicle-grid">
        {vehicles.map((vehicle) => (
          <VehicleCard 
            key={vehicle.id} 
            vehicle={vehicle} 
            onView={handleView} 
            onSelect={handleSelect} 
            onRefreshData={fetchData} 
          />
        ))}
      </div>

      {/* ==================== POPUP MODALS ==================== */}
      {modalMode && selectedVehicle && (
        <div className="modal-overlay" onClick={() => setModalMode(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          {/* 🟢 บีบขนาดความกว้างของป๊อปอัปสไตล์ Facebook ให้เหลือ 480px จะดูจับคู่กระชับกะทัดรัดขึ้นมากคัป */}
          <div className="booking-modal fg-rise" style={{ maxWidth: "480px", width: "90%", backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }} onClick={e => e.stopPropagation()}>
            
            {modalMode === "view" && (
              <>
                <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h2 style={{ fontSize: "16px", margin: 0, fontWeight: "700" }}><Eye size={18} style={{ verticalAlign: "middle", marginRight: "6px", color: "#1e3a8a" }} /> รายละเอียดข้อมูลยานพาหนะ</h2>
                  <button type="button" className="close-btn" onClick={() => setModalMode(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X size={20} /></button>
                </div>
                <div className="modal-body">
                  <div className="modal-vehicle-detailed-panel">
                    {/* 🟢 [กรอบรูปสไตล์ Facebook เฟี้ยว ๆ]: ใช้สัดส่วนความกว้าง 100% บังคับตัดขอบด้วย object-fit: cover เพื่อให้รูปเต็มกรอบ ไม่มีขอบขาวขัดใจคัป */}
                    <div 
  onClick={() => setZoomedImage(selectedVehicle.image)}
  title="คลิกเพื่อส่องดูรูปขนาดใหญ่"
  style={{ 
    width: "100%", 
    aspectRatio: "16 / 10", // 🌟 ใช้สูตร Aspect Ratio บังคับกรอบให้พอดีกับภาพรถยนต์ถ่ายทั่วไป
    borderRadius: "12px", 
    overflow: "hidden", 
    border: "1px solid #e5e7eb", 
    backgroundColor: "#f9fafb", 
    position: "relative", 
    cursor: "pointer", 
    display: "flex" 
  }}
>
  <img 
    src={selectedVehicle.image} 
    alt={selectedVehicle.model} 
    style={{ 
      width: "100%", 
      height: "100%", 
      objectFit: "cover", // 🌟 รูปภาพจะถมขยายเต็มกรอบอย่างสมส่วน ไม่ยืด ไม่เบี้ยวคัป
      objectPosition: "center" // 🌟 ล็อกโฟกัสเลนส์ให้อยู่ตรงกลางภาพตัวรถเป๊ะๆ
    }}
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
                    <button type="button" onClick={() => setModalMode(null)} style={{ padding: "8px 20px", backgroundColor: "#1e3a8a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>ปิดหน้าต่างรายละเอียด</button>
                  </div>
                </div>
              </>
            )}

            {modalMode === "booking" && (
              <form onSubmit={handleConfirmBooking}>
                <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h2 style={{ fontSize: "16px", margin: 0, fontWeight: "700", color: "#1e3a8a" }}>📅 บันทึกคำขอสิทธิ์จองคิวยานพาหนะ</h2>
                  <button type="button" className="close-btn" onClick={() => setModalMode(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X size={20} /></button>
                </div>
                <div className="modal-body">
                  <div className="modal-user-status-strip" style={{ marginBottom: "12px" }}>
                    <div className="user-logged-info" style={{ fontSize: "13px", color: "#4b5563" }}>
                      <span>ชื่อบัญชีผู้ขอจองรถ: <strong style={{ color: "#111827" }}>{currentUser}</strong></span>
                    </div>
                  </div>

                  {/* 🟢 [กรอบรูปกะทัดรัดสไตล์หน้าฟีดเฟส]: ปรับภาพสัดส่วนดีไซน์สมส่วนขึ้นด้วย object-fit: cover ขนาดพอดีตาคัป */}
                  <div className="modal-vehicle-info" style={{ padding: "10px", display: "flex", gap: "14px", backgroundColor: "#f9fafb", borderRadius: "8px", alignItems: "center", border: "1px solid #f3f4f6" }}>
                    <div 
                      onClick={() => setZoomedImage(selectedVehicle.image)}
                      title="คลิกส่องรูปใหญ่"
                      style={{ width: "90px", height: "65px", overflow: "hidden", borderRadius: "6px", backgroundColor: "#fff", display: "flex", alignItems: "center", cursor: "pointer", border: "1px solid #e5e7eb", position: "relative" }}
                    >
                      <img 
                        src={selectedVehicle.image} 
                        alt={selectedVehicle.model} 
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                        onError={(e)=>{e.target.src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600"}} 
                      />
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 2px 0", fontSize: "15px", fontWeight: "600", color: "#111827" }}>{selectedVehicle.model}</h4>
                      <p style={{ margin: "0", fontSize: "12px", color: "#6b7280" }}><strong>ทะเบียน:</strong> {selectedVehicle.plate}</p>
                    </div>
                  </div>

                  <div className="modal-form-inputs" style={{ marginTop: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div>
                        <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px", color: "#374151" }}>เลือกวันที่เริ่มต้น</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box", fontSize: "14px" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px", color: "#374151" }}>เลือกวันที่สิ้นสุด</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box", fontSize: "14px" }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer" style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button type="button" onClick={() => setModalMode(null)} style={{ padding: "8px 16px", border: "1px solid #d1d5db", backgroundColor: "#fff", color: "#4b5563", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>ยกเลิก</button>
                  <button type="submit" style={{ padding: "8px 24px", backgroundColor: "#F59E0B", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer", fontSize: "14px" }}>ยืนยันส่งใบจอง</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ==================== 🟢 [POPUP LIGHTBOX]: แสดงขยายรูปภาพขนาดเต็มจอระดับ Full Screen ทรงประสิทธิภาพคัป ==================== */}
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