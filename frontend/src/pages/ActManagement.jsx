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

  return (
    <MainLayout activePage="act-management" onNavigate={onNavigate} title="📄 จัดการข้อมูล พ.ร.บ. ยานพาหนะ" subtitle="ตรวจสอบวันหมดอายุ พ.ร.บ. และบันทึกการต่ออายุ">
      
      <div className="admin-table">
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

              return (
                <tr key={v.id} style={{ backgroundColor: isExpired ? "#FEF2F2" : isWarning ? "#FFFBEB" : "transparent" }}>
                  <td>
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
                  <td>
                    <div style={{ fontWeight: "bold", color: "#111827" }}>{v.model}</div>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>{v.plate}</div>
                  </td>
                  <td style={{ fontWeight: "600", color: "#1e3a8a" }}>{v.act_number || "ยังไม่ได้ระบุ"}</td>
                  <td style={{ textAlign: "center", fontWeight: "500" }}>
                    {v.act_expiry_date ? new Date(v.act_expiry_date).toLocaleDateString('th-TH') : "-"}
                  </td>
                  
                  {/* สถานะ พ.ร.บ. */}
                  <td style={{ textAlign: "center" }}>
                    {!v.act_expiry_date ? (
                      <span style={{ fontSize: "11px", padding: "3px 8px", backgroundColor: "#f3f4f6", color: "#6b7280", borderRadius: "999px" }}>ไม่มีข้อมูล</span>
                    ) : isExpired ? (
                      <span style={{ fontSize: "10px", padding: "3px 8px", backgroundColor: "#DC2626", color: "#fff", borderRadius: "999px", fontWeight: "bold" }}>
                        ❌ หมดอายุแล้ว {diffDays < 0 ? `(${Math.abs(diffDays)} วัน)` : "(วันนี้)"}
                      </span>
                    ) : isWarning ? (
                      <span style={{ fontSize: "11px", padding: "3px 8px", backgroundColor: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: "999px", fontWeight: "bold" }}>
                        ⚠️ เหลืออีก {diffDays} วัน ({approxMonths} เดือน)
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", padding: "3px 8px", backgroundColor: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", borderRadius: "999px", fontWeight: "bold" }}>
                        🟢 เหลืออีก {diffDays} วัน ({approxMonths} เดือน)
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