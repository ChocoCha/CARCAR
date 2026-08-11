import { Eye, Calendar, AlertTriangle, ToggleLeft, ToggleRight } from "lucide-react";

export default function VehicleCard({ vehicle, onView, onSelect, onRefreshData }) {
  const isMaintenance = vehicle.status === "maintenance";

  // 🟢 ดึงข้อมูลเพื่อเช็คว่าคนล็อกอินปัจจุบันเป็น Admin ไหม (ถ้าใช่ถึงจะเห็นสวิตช์ไฟ)
  const storedUserRole = localStorage.getItem("borrowerName");
  const isAdmin = storedUserRole && storedUserRole.includes("Admin");

  // 🟢 ฟังก์ชันคลิกสลับสถานะเป็นสวิตช์ไฟ ยิงตรงเข้าหลังข้อมูล MariaDB ทันที
  async function handleToggleStatus(e) {
    e.stopPropagation(); // กันไม่ให้คลิกปุ่มแล้วไปโดนตัวการ์ดหลัก

    const nextStatus = isMaintenance ? "available" : "maintenance";

    try {
      // ยิงไปหาเส้น PUT แก้ไขรถเดิมที่เราทำไว้ใน server.js
      const res = await fetch(`http://localhost:5000/api/vehicles/${vehicle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: vehicle.model,
          plate: vehicle.plate,
          seats: vehicle.seats,
          image: vehicle.image,
          status: nextStatus // ส่งสถานะใหม่ที่สลับแล้วไปบันทึก
        })
      });

      if (res.ok) {
        // 🔄 เรียกฟังก์ชันสะพานดึงข้อมูลใหม่ เพื่อสั่งให้หน้าจอเปลี่ยนสถานะทันทีแบบเรียลไทม์
        if (onRefreshData) onRefreshData();
      } else {
        alert("ไม่สามารถเปลี่ยนสถานะสวิตช์ไฟหลังบ้านได้");
      }
    } catch (err) {
      console.error("สลับสถานะล้มเหลว:", err);
    }
  }

  return (
    <div className={`vehicle-card ${isMaintenance ? "car-disabled" : ""}`}>

      {/* 🖼️ ส่วนรูปภาพตัวรถ */}
      <div className="vehicle-card-image">
        <img
          src={vehicle.image}
          alt={vehicle.model}
          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600" }}
        />

        

        {/* 🎛️ [ปุ่มสวิตช์ไฟ] โผล่ที่มุมขวาบนของการ์ดรถ เฉพาะบัญชี Admin เท่านั้น */}
        {isAdmin && (
          <div
            onClick={handleToggleStatus}
            className="vehicle-toggle-switch"
            title={isMaintenance ? "คลิกเพื่อเปิดสวิตช์: ให้กลับมาพร้อมใช้งาน" : "คลิกเพื่อปิดสวิตช์: สั่งรถเสียเข้าอู่"}
          >
            <span className={`vehicle-toggle-label ${isMaintenance ? "is-off" : "is-on"}`}>
              {isMaintenance ? "ปิดระบบซ่อม" : "เปิดใช้งาน"}
            </span>
            {isMaintenance ? (
              <ToggleLeft size={22} style={{ color: "#dc2626" }} />
            ) : (
              <ToggleRight size={22} style={{ color: "#10b981" }} />
            )}
          </div>
        )}

        {/* 🔴 ม่านแบนเนอร์สีแดงปิดทับตัวรถกรณีสถานะเป็น "maintenance" */}
        {isMaintenance && (
          <div className="vehicle-maintenance-overlay">
            <AlertTriangle size={24} />
            <span>งดใช้งาน (ชำรุด / ซ่อมบำรุง)</span>
          </div>
        )}
      </div>

      {/* 📝 รายละเอียดข้อความสเปครถด้านล่าง */}
      <div className="vehicle-card-body">
        <h3 className="vehicle-card-title">{vehicle.model}</h3>
        <p className="vehicle-card-meta">ทะเบียน: {vehicle.plate} · {vehicle.seats} ที่นั่ง</p>

        <div className="vehicle-card-actions">
          <button
            type="button"
            className="btn-outline-gold"
            onClick={() => onView?.(vehicle)}
          >
            <Eye size={14} /> รายละเอียด
          </button>

          <button
            type="button"
            className="btn-gold"
            onClick={() => !isMaintenance && onSelect?.(vehicle)}
            disabled={isMaintenance}
          >
            <Calendar size={14} /> {isMaintenance ? "ไม่พร้อมจอง" : "เลือกจองรถ"}
          </button>
        </div>
      </div>

    </div>
  );
}