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
    <div className={`vehicle-card ${isMaintenance ? "car-disabled" : ""}`} style={{ 
      position: "relative",
      backgroundColor: "#fff", 
      borderRadius: "12px", 
      border: "1px solid #e5e7eb", 
      overflow: "hidden",
      boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
    }}>
      
      {/* 🖼️ ส่วนรูปภาพตัวรถ */}
      <div style={{ position: "relative", width: "100%", height: "160px", backgroundColor: "#f3f4f6" }}>
        <img 
          src={vehicle.image} 
          alt={vehicle.model} 
          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600" }} 
        />

        {/* 🎛️ [ปุ่มสวิตช์ไฟ] โผล่ที่มุมขวาบนของการ์ดรถ เฉพาะบัญชี Admin เท่านั้น */}
        {isAdmin && (
          <div 
            onClick={handleToggleStatus}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              padding: "4px 8px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              zIndex: 20, // 💡 ดันขึ้นมาเหนือกำแพงสีแดงให้แอดมินกดเปิดปิดสวิตช์คืนสภาพได้ตลอดเวลา
              userSelect: "none"
            }}
            title={isMaintenance ? "คลิกเพื่อเปิดสวิตช์: ให้กลับมาพร้อมใช้งาน" : "คลิกเพื่อปิดสวิตช์: สั่งรถเสียเข้าอู่"}
          >
            <span style={{ fontSize: "11px", fontWeight: "700", color: isMaintenance ? "#dc2626" : "#059669" }}>
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
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(220, 38, 38, 0.85)", 
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            gap: "6px",
            zIndex: 10
          }}>
            <AlertTriangle size={24} style={{ marginTop: "14px" }} />
            <span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "0.5px" }}>งดใช้งาน (ชำรุด / ซ่อมบำรุง)</span>
          </div>
        )}
      </div>

      {/* 📝 รายละเอียดข้อความสเปครถด้านล่าง */}
      <div style={{ padding: "16px" }}>
        <h3 style={{ margin: "0 0 4px 0", color: "#111827", fontSize: "16px", fontWeight: "700" }}>{vehicle.model}</h3>
        <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: "13px" }}>ทะเบียน: {vehicle.plate} · {vehicle.seats} ที่นั่ง</p>
        
        <div style={{ display: "flex", gap: "8px" }}>
          <button 
            type="button"
            onClick={() => onView?.(vehicle)} 
            style={{ flex: 1, padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", backgroundColor: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px", fontWeight: "600", color: "#4b5563" }}
          >
            <Eye size={14} /> รายละเอียด
          </button>

          <button 
            type="button"
            onClick={() => !isMaintenance && onSelect?.(vehicle)} 
            disabled={isMaintenance}
            style={{ 
              flex: 1, 
              padding: "8px", 
              border: "none", 
              borderRadius: "6px", 
              backgroundColor: isMaintenance ? "#e5e7eb" : "#F59E0B", 
              color: isMaintenance ? "#9ca3af" : "#fff", 
              fontWeight: "600", 
              fontSize: "13px",
              cursor: isMaintenance ? "not-allowed" : "pointer", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              gap: "6px" 
            }}
          >
            <Calendar size={14} /> {isMaintenance ? "ไม่พร้อมจอง" : "เลือกจองรถ"}
          </button>
        </div>
      </div>

    </div>
  );
}