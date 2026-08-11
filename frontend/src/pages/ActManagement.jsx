import { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { FileText, Edit3, AlertTriangle, CheckCircle, Save, X } from "lucide-react";
import "../styles/admin.css";

export default function ActManagement({ onNavigate }) {
  // 🟢 ดึง IP ของเครื่องเซิร์ฟเวอร์อัตโนมัติ
  const API_BASE = `http://${window.location.hostname}:5000/api`;

  // 🟢 Helper แปลง Path รูปภาพให้ต่อ IP เครื่องเซิร์ฟเวอร์เต็มรูปแบบ
  const getImageUrl = (imagePath) => {
    if (!imagePath) return "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=300";
    if (imagePath.startsWith("http")) return imagePath;
    return `http://${window.location.hostname}:5000${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
  };

  const [vehicles, setVehicles] = useState([]);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [actForm, setActForm] = useState({ act_number: "", act_expiry_date: "" });

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    try {
      // 🟢 เรียกผ่าน API_BASE
      const res = await fetch(`${API_BASE}/vehicles`);
      if (res.ok) setVehicles(await res.json());
    } catch (err) {
      console.error(err);
    }
  }

  function handleStartEdit(v) {
    setEditingVehicle(v);
    setActForm({
      act_number: v.act_number || "",
      act_expiry_date: v.act_expiry_date ? v.act_expiry_date.split("T")[0] : ""
    });
  }

  async function handleSaveAct(e) {
    e.preventDefault();
    try {
      // 🟢 เรียกผ่าน API_BASE
      const res = await fetch(`${API_BASE}/vehicles/${editingVehicle.id}/act`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actForm)
      });
      if (res.ok) {
        alert("🎯 อัปเดตข้อมูล พ.ร.บ. สำเร็จเรียบร้อย!");
        setEditingVehicle(null);
        fetchVehicles();
      }
    } catch (err) {
      console.error(err);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 🟢 สรุปจำนวนรถแยกตามสถานะ พ.ร.บ. (คำนวณฝั่ง frontend ล้วน ๆ เพื่อแสดงแถบสรุปด้านบน)
  const summary = vehicles.reduce((acc, v) => {
    if (!v.act_expiry_date) { acc.none += 1; return acc; }
    const expDate = new Date(v.act_expiry_date);
    expDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) acc.expired += 1;
    else if (diffDays <= 90) acc.warning += 1;
    else acc.ok += 1;
    return acc;
  }, { expired: 0, warning: 0, ok: 0, none: 0 });

  return (
    <MainLayout activePage="act-management" onNavigate={onNavigate} title=" จัดการข้อมูล พ.ร.บ. รถยนต์" subtitle="ตรวจสอบวันหมดอายุ พ.ร.บ. และบันทึกการต่ออายุ">

      

      <div className="admin-table">
        <h3 className="admin-section-title">รายการรถยนต์ทั้งหมด</h3>
        <table className="act-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>รูป</th>
              <th style={{ textAlign: "left" }}>รุ่นรถ / ทะเบียน</th>
              <th style={{ textAlign: "left" }}>เลข พ.ร.บ.</th>
              <th style={{ textAlign: "center" }}>วันหมดอายุ พ.ร.บ.</th>
              <th style={{ textAlign: "center" }}>ระยะเวลาคงเหลือ / สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => {
              let diffDays = null;
              let approxMonths = null;
              let isExpired = false;
              let isWarning = false;

              if (v.act_expiry_date) {
                const expDate = new Date(v.act_expiry_date);
                expDate.setHours(0, 0, 0, 0);

                const diffTime = expDate.getTime() - today.getTime();
                diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                approxMonths = (diffDays / 30).toFixed(1);
                if (approxMonths.endsWith('.0')) {
                  approxMonths = Math.round(diffDays / 30);
                }

                if (diffDays <= 0) {
                  isExpired = true;
                } else if (diffDays <= 90) {
                  isWarning = true;
                }
              }

              // 🟢 สัดส่วนแถบความคืบหน้า (เทียบระยะ 1 ปี) ใช้แสดงผลอย่างเดียว ไม่กระทบข้อมูลจริง
              const progressPct = diffDays === null ? 0 : Math.min(100, Math.max(0, (diffDays / 365) * 100));

              return (
                <tr key={v.id} className={`act-row ${isExpired ? "is-expired" : isWarning ? "is-warning" : ""}`}>
                  <td data-label="รูป">
                    {/* 🟢 แสดงผลรูปภาพผ่าน getImageUrl */}
                    <img
                      src={getImageUrl(v.image)}
                      alt={v.model}
                      className="vehicle-img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=300";
                      }}
                    />
                  </td>
                  <td data-label="รุ่นรถ / ทะเบียน">
                    <div className="act-model-name">{v.model}</div>
                    <div className="act-model-plate">{v.plate}</div>
                  </td>
                  <td data-label="เลข พ.ร.บ." className="act-number-cell">{v.act_number || "ยังไม่ได้ระบุ"}</td>
                  <td data-label="วันหมดอายุ พ.ร.บ." className="act-date-cell">
                    {v.act_expiry_date ? new Date(v.act_expiry_date).toLocaleDateString('th-TH') : "-"}
                  </td>

                  {/* สถานะ พ.ร.บ. */}
                  <td data-label="สถานะ" style={{ textAlign: "center" }}>
                    {!v.act_expiry_date ? (
                      <span className="act-status-pill is-none">ไม่มีข้อมูล</span>
                    ) : isExpired ? (
                      <span className="act-status-pill is-expired-badge">
                        <AlertTriangle size={11} /> หมดอายุแล้ว {diffDays < 0 ? `(${Math.abs(diffDays)} วัน)` : "(วันนี้)"}
                      </span>
                    ) : isWarning ? (
                      <span className="act-status-pill is-warning-badge">
                        <AlertTriangle size={11} /> เหลืออีก {diffDays} วัน ({approxMonths} เดือน)
                      </span>
                    ) : (
                      <span className="act-status-pill is-ok-badge">
                        <CheckCircle size={11} /> เหลืออีก {diffDays} วัน ({approxMonths} เดือน)
                      </span>
                    )}

                    
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </MainLayout>
  );
}