import { useState, useRef, useEffect } from "react";
import {
  Car,
  Lock,
  User,
  ShieldCheck,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import "../styles/login.css";

function PlateInput({ value, onChange, placeholder }) {
  return (
    <div className="fg-input-wrap">
      <span className="fg-plate-tag">ID</span>
      <div className="fg-plate-divider" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        className="fg-plate-input"
      />
    </div>
  );
}

function Field({ icon: Icon, ...props }) {
  return (
    <div className="fg-input-wrap">
      <Icon size={16} />
      <input {...props} />
    </div>
  );
}

export default function Login({ onLoginSuccess }) {
  const [role, setRole] = useState("employee"); 
  const [status, setStatus] = useState(null); 

  // employee login state
  const [empId, setEmpId] = useState("");
  const [empPass, setEmpPass] = useState("");

  // admin login state
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");

  const timerRef = useRef(null);
  const redirectRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(redirectRef.current);
    };
  }, []);

  function flashStatus(type, msg) {
    setStatus({ type, msg });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus(null), 2600);
  }

  // ==================== [ 🟢 เข้าสู่ระบบ: ฝั่งพนักงาน ] ====================
  async function handleEmployeeLogin(e) {
    e.preventDefault();
    if (!empId.trim() || !empPass.trim()) {
      flashStatus("err", "กรอกรหัสพนักงานและรหัสผ่านให้ครบ");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: empId,
          password: empPass,
          role: "employee"
        })
      });

      const data = await response.json();

     if (response.ok && data.success) {
  // 🟢 สลับกลับมาใช้สิทธิ์แนวประยุกต์: 
  localStorage.setItem("borrowerName", data.user.name);       // ให้จำชื่อภาษาไทยเหมือนเดิม (หน้าจอทุกหน้าจะกลับมาโชว์ชื่อไทยทันที!)
  localStorage.setItem("borrowerEmpId", data.user.username);  // แอบเก็บรหัสพนักงานภาษาอังกฤษแยกไว้คุยกับเดตาเบส
  localStorage.setItem("userRole", "employee");
      
  
  flashStatus("ok", `ยินดีต้อนรับคุณ ${data.user.name} — กำลังไปหน้าแดชบอร์ด`);
        
        clearTimeout(redirectRef.current);
        redirectRef.current = setTimeout(() => {
          onLoginSuccess?.();
        }, 1200);
      } else {
        flashStatus("err", data.message || "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch (err) {
      flashStatus("err", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลังบ้านได้");
    }
  }

  // ==================== [ 🟢 เข้าสู่ระบบ: ฝั่งผู้ดูแลระบบ (Admin) ] ====================
  async function handleAdminLogin(e) {
    e.preventDefault();
    if (!adminUser.trim() || !adminPass.trim()) {
      flashStatus("err", "กรอกบัญชีผู้ดูแลระบบให้ครบ");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUser,
          password: adminPass,
          role: "admin"
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
  // 🟢 สำหรับแอดมินก็ทำเช่นเดียวกันคัป
  localStorage.setItem("borrowerName", data.user.name || "ผู้ดูแลระบบสูงสุด"); 
  localStorage.setItem("borrowerEmpId", data.user.username);  // เก็บคำว่า admin แยกไว้
  localStorage.setItem("userRole", "admin");
  
  flashStatus("ok", "🛡️ ยืนยันตัวตนแอดมินสำเร็จ — กำลังเปิดหน้าแผงควบคุมหลัก");
        
        clearTimeout(redirectRef.current);
        redirectRef.current = setTimeout(() => {
          onLoginSuccess?.(); 
        }, 1200);
      
        
      } else {
        flashStatus("err", data.message || "ชื่อผู้ใช้หรือรหัสผ่านแอดมินไม่ถูกต้อง");
      }
    } catch (err) {
      flashStatus("err", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  }

  function switchRole(next) {
    setRole(next);
    setStatus(null);
  }

  return (
    <div className="fg-page">
      <div className="fg-container">
        {/* brand */}
        <div className="fg-brand">
          <div className="fg-brand-mark">
            <Car size={16} strokeWidth={2.5} />
          </div>
          <div>
            <div className="fg-brand-name">ระบบจองรถ</div>
            <div className="fg-brand-sub">Systemprime</div>
          </div>
        </div>

        {/* role toggle */}
        <div className="fg-toggle">
          <button
            type="button"
            onClick={() => switchRole("employee")}
            className={`fg-toggle-btn ${role === "employee" ? "is-active" : ""}`}
          >
            <Car size={14} /> พนักงาน
          </button>
          <button
            type="button"
            onClick={() => switchRole("admin")}
            className={`fg-toggle-btn ${role === "admin" ? "is-active" : ""}`}
          >
            <ShieldCheck size={14} /> ผู้ดูแลระบบ
          </button>
        </div>

        {/* card */}
        <div className="fg-card">
          {role === "employee" ? (
            <div key="employee" className="fg-rise">
              <h2 className="fg-title">เข้าสู่ระบบจองรถ</h2>
              <p className="fg-subtitle">ใช้รหัสพนักงานและรหัสผ่านที่ได้รับจากแอดมิน</p>

              <form onSubmit={handleEmployeeLogin} className="fg-form">
                <div className="fg-field-group">
                  <label className="fg-label">รหัสพนักงาน</label>
                  <PlateInput
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    placeholder="กรอกรหัสพนักงาน"
                  />
                </div>
                <div className="fg-field-group">
                  <label className="fg-label">รหัสผ่าน</label>
                  <Field
                    icon={Lock}
                    type="password"
                    value={empPass}
                    onChange={(e) => setEmpPass(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <button type="submit" className="fg-btn-primary">
                  เข้าสู่ระบบ <ChevronRight size={16} />
                </button>
              </form>
            </div>
          ) : (
            <div key="admin" className="fg-rise">
              <h2 className="fg-title">เข้าสู่ระบบผู้ดูแล</h2>
              <p className="fg-subtitle">สำหรับแอดมินที่จัดการบัญชีพนักงานและคลังรถยนต์ของบริษัท</p>

              <form onSubmit={handleAdminLogin} className="fg-form">
                <div className="fg-field-group">
                  <label className="fg-label">ชื่อผู้ใช้งานแอดมิน</label>
                  <Field
                    icon={User}
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    placeholder="ชื่อผู้ใช้แอดมิน "
                  />
                </div>
                <div className="fg-field-group">
                  <label className="fg-label">รหัสผ่าน</label>
                  <Field
                    icon={Lock}
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    placeholder="รหัสผ่านแอดมิน"
                  />
                </div>
                <button type="submit" className="fg-btn-primary">
                  ยืนยันตัวตนเพื่อเข้าแผงควบคุม <ShieldCheck size={16} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* status toast */}
        <div className="fg-toast-slot">
          {status && (
            <div className={`fg-toast fg-rise ${status.type === "ok" ? "is-ok" : "is-err"}`}>
              {status.type === "ok" ? <Check size={14} /> : <X size={14} />}
              {status.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}