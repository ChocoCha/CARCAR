import { useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown, User, Bell } from "lucide-react";

export default function Navbar({ onNavigate }) {
  // ดึงชื่อผู้ใช้ปัจจุบันจากคลังความจำเครื่อง
  const currentUser = localStorage.getItem("borrowerName") || "ผู้ใช้งานระบบ";
  
  // 🎛️ State คุมการเปิด-ปิด ป๊อปอัป Dropdown เล็ก ๆ ตรงชื่อยูเซอร์
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 💡 ระบบปิดหน้าต่าง Dropdown อัตโนมัติเมื่อเผลอไปคลิกพื้นที่ว่างข้างนอกปุ่ม
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🟢 ฟังก์ชันไม้ตาย: เคลียร์ค่าออกจากระบบ แล้วเด้งกลับไปหน้าล็อกอินแบบคลีนๆ
  const handleLogout = () => {
    if (!confirm("🔒 คุณต้องการออกจากระบบใช่หรือไม่?")) return;
    
    // ล้างความจำสิทธิ์และชื่อที่เคยฝังไว้ในเครื่องออกให้หมดจด
    localStorage.removeItem("borrowerName");
    localStorage.setItem("userRole", "employee"); // ปรับสิทธิ์กลับเป็นทั่วไปเพื่อความปลอดภัย
    
    // 🚀 สั่ง Refresh หน้าจอ 1 ครั้งเพื่อเคลียร์ State และถีบตัวผู้ใช้กลับหน้า Login ออโต้คัป
    window.location.reload();
  };

  return (
    <header className="main-navbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb" }}>
      {/* 🟢 ฝั่งซ้าย: ปล่อยโล่งหรือแสดงชื่อหน้าปัจจุบัน */}
      <div></div>

      {/* 🟢 ฝั่งขวา: กลุ่มเมนูควบคุมบัญชีผู้ใช้ */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        
        {/* ❌ เอาปุ่มประวัติการจองเดิมออกเรียบร้อยแล้วตามบรีฟคัป */}

        

        {/* 👑 [แผง Dropdown โปรไฟล์ใหม่]: ครอบโครงสร้างไว้ด้วยระบบคลิกนุ่มตา */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button 
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 12px", backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "9999px", cursor: "pointer", outline: "none" }}
          >
            {/* วงกลมสัญลักษณ์รูปโปรไฟล์ย่อ */}
            <div style={{ width: "26px", height: "26px", borderRadius: "50%", backgroundColor: "#1e3a8a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}>
              {currentUser.charAt(0)}
            </div>
            
            {/* แสดงชื่อยูเซอร์ผู้ใช้งานปัจจุบัน */}
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>{currentUser}</span>
            <ChevronDown size={14} style={{ color: "#6b7280", transform: isDropdownOpen ? "rotate(180deg)" : "none", transition: "0.2s" }} />
          </button>

          {/* 📦 กล่องรายการเมนูยื่นสไลด์ลงมา (โผล่เมื่อคลิกที่ชื่อ) */}
          {isDropdownOpen && (
            <div className="fg-rise" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "160px", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", zIndex: 1100, overflow: "hidden", padding: "4px 0" }}>
              
              {/* ปุ่ม Logout สีแดงเด่นชัดเจน */}
              <button
                type="button"
                onClick={handleLogout}
                style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px", border: "none", backgroundColor: "transparent", color: "#dc2626", fontSize: "13px", fontWeight: "600", textAlign: "left", cursor: "pointer", transition: "0.15s" }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#fef2f2"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
              >
                <LogOut size={14} /> ออกจากระบบ
              </button>

            </div>
          )}
        </div>

      </div>
    </header>
  );
}