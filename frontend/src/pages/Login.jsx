import { useState, useRef, useEffect } from "react";
import { Car, Lock, User, ChevronRight, Check, X, Eye, EyeOff } from "lucide-react";
import "../styles/login.css";

function Field({ icon: Icon, isPassword, showPassword, onTogglePassword, ...props }) {
  return (
    <div className="fg-input-wrap" style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <Icon size={16} />
      <input
        {...props}
        type={isPassword ? (showPassword ? "text" : "password") : props.type}
        style={{ paddingRight: isPassword ? "36px" : undefined, width: "100%" }}
      />
      {isPassword && (
        <button
          type="button"
          onClick={onTogglePassword}
          style={{ position: "absolute", right: "10px", background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
          tabIndex="-1"
        >
          {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      )}
    </div>
  );
}

// สกายไลน์ตู้เซิร์ฟเวอร์ + network topology diagram — แทนภูเขา/ดวงจันทร์ในต้นแบบ
function NetworkBanner() {
  const towers = [
    { x: 24, w: 30, h: 46 },
    { x: 66, w: 24, h: 64 },
    { x: 102, w: 34, h: 40 },
    { x: 210, w: 26, h: 54 },
    { x: 250, w: 34, h: 38 },
    { x: 296, w: 24, h: 60 },
    { x: 332, w: 30, h: 46 },
  ];
  const baseY = 168;

  return (
    <svg viewBox="0 0 400 168" xmlns="http://www.w3.org/2000/svg">
      {/* mesh links เชื่อมยอดตู้ */}
      <path className="fg-link" d="M39,122 L78,104 L119,128" />
      <path className="fg-link" d="M223,114 L267,130 L308,108 L347,122" />

      {/* เส้นสัญญาณจาก hub ลงตู้เซิร์ฟเวอร์ */}
      <path className="fg-link-hub" d="M200,40 L119,128" />
      <path className="fg-link-hub" d="M200,40 L267,130" />
      <path className="fg-link-hub" d="M200,40 L200,150" />

      {/* ตู้เซิร์ฟเวอร์ */}
      {towers.map((t, i) => (
        <g key={i}>
          <rect className="fg-rack" x={t.x} y={baseY - t.h} width={t.w} height={t.h} rx={3} />
          <circle className="fg-led" cx={t.x + 8} cy={baseY - t.h + 10} r={1.6} style={{ animationDelay: `${i * 0.3}s` }} />
          <circle className="fg-led dim" cx={t.x + 8} cy={baseY - t.h + 18} r={1.6} style={{ animationDelay: `${i * 0.4}s` }} />
        </g>
      ))}

      {/* จุดโหนดที่ยอดตู้ */}
      <circle className="fg-node" cx="119" cy="128" r="3" />
      <circle className="fg-node" cx="267" cy="130" r="3" />
      <circle className="fg-node" cx="200" cy="150" r="2.5" />

      {/* hub กลาง แทนดวงจันทร์ */}
      <circle className="fg-hub-ring" cx="200" cy="40" r="15" />
      <circle className="fg-hub" cx="200" cy="40" r="6" />

      {/* สัญญาณวิ่งตามสาย */}
      <circle className="fg-pulse fg-pulse-a" r="2.5" />
      <circle className="fg-pulse fg-pulse-b" r="2.5" />
      <circle className="fg-pulse fg-pulse-c" r="2.5" />
    </svg>
  );
}

export default function Login({ onLoginSuccess }) {
  const API_BASE = `http://${window.location.hostname}:5000/api`;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(null);

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

  // 🟢 ฟังก์ชันล็อกอินอันเดียว รองรับทั้งพนักงานและแอดมิน
  async function handleLogin(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      flashStatus("err", "กรอกชื่อผู้ใช้งานและรหัสผ่านให้ครบถ้วน");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const userRole = data.user.role || "employee";

        // 🟢 บันทึกข้อมูลลง LocalStorage
        localStorage.setItem("borrowerName", data.user.name);
        localStorage.setItem("borrowerEmpId", data.user.username);
        localStorage.setItem("userRole", userRole);

        // 🟢 แสดงข้อความต้อนรับตาม Role
        if (userRole === "admin") {
          flashStatus("ok", `ยินดีต้อนรับแอดมิน ${data.user.name} `);
        } else {
          flashStatus("ok", `ยินดีต้อนรับคุณ ${data.user.name} `);
        }

        clearTimeout(redirectRef.current);
        redirectRef.current = setTimeout(() => {
          onLoginSuccess?.();
        }, 1200);
      } else {
        flashStatus("err", data.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch (err) {
      flashStatus("err", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  }

  return (
    <div className="fg-page">
      <div className="fg-container">
        <div className="fg-brand">
          <div className="fg-brand-mark">
            <Car size={16} strokeWidth={2.5} />
          </div>
          <div>
            <div className="fg-brand-name">ระบบจองรถ</div>
            <div className="fg-brand-sub">Systemprime</div>
          </div>
          <div className="fg-status">
           
          </div>
        </div>

        <div className="fg-card">
          <div className="fg-banner">
            <NetworkBanner />
          </div>

          <div className="fg-rise">
            
            <h2 className="fg-title">เข้าสู่ระบบ</h2>
            <p className="fg-subtitle">กรอกรหัสผู้ใช้งานและรหัสผ่านเพื่อเข้าใช้งานระบบ</p>

            <form onSubmit={handleLogin} className="fg-form">
              <div className="fg-field-group">
                <label className="fg-label">ชื่อผู้ใช้งาน </label>
                <Field
                  icon={User}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="กรอกชื่อผู้ใช้งาน"
                />
              </div>

              <div className="fg-field-group">
                <label className="fg-label">รหัสผ่าน</label>
                <Field
                  icon={Lock}
                  isPassword={true}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" className="fg-btn-primary">
                เข้าสู่ระบบ <ChevronRight size={16} />
              </button>
            </form>
          </div>
        </div>

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