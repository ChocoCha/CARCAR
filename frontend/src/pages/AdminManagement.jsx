import { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
// 🟢 แก้ไข: เติม Layers เข้ามาในกลุ่มนำเข้า lucide-react เพื่อเคลียร์เออร์เรอร์ ReferenceError คัป
import { User, Car, Plus, Trash2, Edit3, X, Upload, Layers } from "lucide-react";

export default function AdminManagement({ onNavigate }) {
  const [activeSubTab, setActiveSubTab] = useState("employees"); 
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]); // 🟢 เก็บประวัติการจองทั้งหมดของทุกคน

  // คุมการเปิด-ปิด ป๊อปอัป (Modal UI Control)
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);

  // State ฟอร์มพนักงาน
  const [empForm, setEmpForm] = useState({ id: "", name: "", dept: "", password: "1234", role: "employee" });
  const [editingEmpId, setEditingEmpId] = useState(null);

  // State ฟอร์มรถยนต์
  const [carForm, setCarForm] = useState({ id: "", model: "", plate: "", seats: 4, image: "", status: "available" });
  const [selectedFile, setSelectedFile] = useState(null); 
  const [editingCarId, setEditingCarId] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  function loadData() {
    if (activeSubTab === "employees") fetchEmployees();
    if (activeSubTab === "vehicles") fetchVehicles();
    if (activeSubTab === "all_bookings") fetchAllBookings(); // 🚀 สั่งดึงประวัติจองทั้งหมดเวลากดเข้าแท็บนี้
  }

  // ==================== [ API: พนักงาน ] ====================
  async function fetchEmployees() {
    const res = await fetch("http://localhost:5000/api/employees");
    if (res.ok) setEmployees(await res.json());
  }

  async function handleSaveEmployee(e) {
    e.preventDefault();
    const isEdit = !!editingEmpId;
    const url = isEdit ? `http://localhost:5000/api/employees/${editingEmpId}` : "http://localhost:5000/api/employees";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: empForm.id.trim(),
        name: empForm.name,
        dept: empForm.dept,
        password: empForm.password,
        role: empForm.role
      })
    });

    if (res.ok) {
      alert(isEdit ? "🎯 อัปเดตข้อมูลบัญชีพนักงานสำเร็จ!" : "✨ เพิ่มบัญชีสำเร็จ!");
      closeEmpModal();
      fetchEmployees();
    }
  }

  async function handleDeleteEmployee(id) {
    if (!confirm(`ยืนยันลบบัญชีรหัส ${id}?`)) return;
    const res = await fetch(`http://localhost:5000/api/employees/${id}`, { method: "DELETE" });
    if (res.ok) { fetchEmployees(); alert("ลบข้อมูลสำเร็จ"); }
  }

  function startEditEmp(emp) {
    setEditingEmpId(emp.id);
    setEmpForm({ id: emp.id, name: emp.name, dept: emp.dept, password: emp.password || "1234", role: emp.role || "employee" });
    setIsEmpModalOpen(true);
  }

  function closeEmpModal() {
    setIsEmpModalOpen(false);
    setEditingEmpId(null);
    setEmpForm({ id: "", name: "", dept: "", password: "1234", role: "employee" });
  }

  // ==================== [ API: ยานพาหนะ ] ====================
  async function fetchVehicles() {
    const res = await fetch("http://localhost:5000/api/vehicles");
    if (res.ok) setVehicles(await res.json());
  }

  async function handleSaveVehicle(e) {
    e.preventDefault();
    const isEdit = !!editingCarId;
    const url = isEdit ? `http://localhost:5000/api/vehicles/${editingCarId}` : "http://localhost:5000/api/vehicles";
    const method = isEdit ? "PUT" : "POST";

    const formData = new FormData();
    formData.append("id", carForm.id);
    formData.append("model", carForm.model);
    formData.append("plate", carForm.plate);
    formData.append("seats", carForm.seats);
    formData.append("status", carForm.status);
    formData.append("image", carForm.image); 
    
    if (selectedFile) {
      formData.append("imageFile", selectedFile);
    }

    const res = await fetch(url, {
      method,
      body: formData 
    });

    if (res.ok) {
      alert(isEdit ? "🎯 แก้ไขสเปครถและอัปโหลดไฟล์รูปภาพสำเร็จ!" : "✨ ลงทะเบียนยานพาหนะพร้อมไฟล์รูปภาพสำเร็จ!");
      closeCarModal();
      fetchVehicles();
    } else {
      const errData = await res.json();
      alert(errData.message || "เกิดข้อผิดพลาดในการบันทึกไฟล์");
    }
  }

  async function handleDeleteVehicle(id) {
    if (!confirm(`ยืนยันลบรถรหัส ${id} ออกจากระบบ?`)) return;
    const res = await fetch(`http://localhost:5000/api/vehicles/${id}`, { method: "DELETE" });
    if (res.ok) { fetchVehicles(); alert("ลบสำเร็จ"); }
  }

  function startEditCar(car) {
    setEditingCarId(car.id);
    setCarForm({ id: car.id, model: car.model, plate: car.plate, seats: car.seats, image: car.image || "", status: car.status || "available" });
    setSelectedFile(null);
    setIsCarModalOpen(true);
  }

  function closeCarModal() {
    setIsCarModalOpen(false);
    setEditingCarId(null);
    setCarForm({ id: "", model: "", plate: "", seats: 4, image: "", status: "available" });
    setSelectedFile(null);
    const fileInput = document.getElementById("carImageFileInput");
    if(fileInput) fileInput.value = "";
  }

  // ==================== [ API: ดึงข้อมูลคิวจองรวมของแอดมิน ] ====================
  async function fetchAllBookings() {
    try {
      // 🟢 เติม ?role=admin เข้าไปท้ายท่อ เพื่อล็อกสัญญาณความปลอดภัยแจกชื่อไทยจากหลังบ้านคัป
      const res = await fetch("http://localhost:5000/api/bookings?role=admin");
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error("ดึงข้อมูลคิวรวมไม่สำเร็จ:", err);
    }
  }

  return (
    <MainLayout activePage="admin-panel" onNavigate={onNavigate} title="🛠️ ระบบผู้ดูแลระบบ (Admin Panel)" subtitle="บริหารจัดการบัญชีผู้ใช้และคลังยานพาหนะของบริษัท">
      
      {/* ส่วนควบคุมแถบเมนูหลัก และปุ่มเปิดโมดอล */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={() => setActiveSubTab("employees")} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: activeSubTab === "employees" ? "#1e3a8a" : "#fff", color: activeSubTab === "employees" ? "#fff" : "#374151", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            <User size={16} /> จัดการบัญชีพนักงาน
          </button>
          <button onClick={() => setActiveSubTab("vehicles")} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: activeSubTab === "vehicles" ? "#1e3a8a" : "#fff", color: activeSubTab === "vehicles" ? "#fff" : "#374151", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            <Car size={16} /> จัดการคลังยานพาหนะ
          </button>
          <button onClick={() => setActiveSubTab("all_bookings")} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: activeSubTab === "all_bookings" ? "#1e3a8a" : "#fff", color: activeSubTab === "all_bookings" ? "#fff" : "#374151", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            <Layers size={16} /> ตรวจสอบประวัติจองรถทั้งหมด
          </button>
        </div>

        {activeSubTab === "employees" && (
          <button onClick={() => setIsEmpModalOpen(true)} style={{ padding: "10px 20px", backgroundColor: "#10B981", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={16} /> เพิ่มบัญชีพนักงานใหม่
          </button>
        )}
        {activeSubTab === "vehicles" && (
          <button onClick={() => setIsCarModalOpen(true)} style={{ padding: "10px 20px", backgroundColor: "#F59E0B", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={16} /> ลงทะเบียนรถใหม่
          </button>
        )}
      </div>

      {/* ==================== แท็บที่ 1: ตารางพนักงาน ==================== */}
      {activeSubTab === "employees" && (
        <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", overflowX: "auto" }}>
          <h3 style={{ margin: "0 0 12px 0", color: "#374151" }}>รายชื่อบัญชีผู้ใช้</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "10px", textAlign: "left", fontSize: "13px" }}>ID / Username</th>
                <th style={{ padding: "10px", textAlign: "left", fontSize: "13px" }}>ชื่อ-นามสกุล</th>
                <th style={{ padding: "10px", textAlign: "left", fontSize: "13px" }}>แผนก</th>
                <th style={{ padding: "10px", textAlign: "center", fontSize: "13px" }}>ตำแหน่งสิทธิ์ (Role)</th>
                <th style={{ padding: "10px", textAlign: "center", fontSize: "13px" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px", fontSize: "13px", fontWeight: "600" }}>{emp.id}</td>
                  <td style={{ padding: "10px", fontSize: "13px" }}>{emp.name}</td>
                  <td style={{ padding: "10px", fontSize: "13px", color: "#4b5563" }}>{emp.dept}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "9999px", backgroundColor: emp.role === "admin" ? "#FEF3C7" : "#E0F2FE", color: emp.role === "admin" ? "#92400E" : "#0369A1", fontWeight: "bold" }}>
                      {emp.role}
                    </span>
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <button onClick={() => startEditEmp(emp)} style={{ marginRight: "8px", color: "#2563EB", border: "none", background: "none", cursor: "pointer" }}><Edit3 size={15} /></button>
                    <button onClick={() => handleDeleteEmployee(emp.id)} style={{ color: "#EF4444", border: "none", background: "none", cursor: "pointer" }}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== แท็บที่ 2: ตารางยานพาหนะ ==================== */}
      {activeSubTab === "vehicles" && (
        <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", overflowX: "auto" }}>
          <h3 style={{ margin: "0 0 12px 0", color: "#374151" }}>คลังรถยนต์บริษัท</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "10px", textAlign: "left", fontSize: "13px" }}>รูป</th>
                <th style={{ padding: "10px", textAlign: "left", fontSize: "13px" }}>ID รถ</th>
                <th style={{ padding: "10px", textAlign: "left", fontSize: "13px" }}>รุ่นยานพาหนะ</th>
                <th style={{ padding: "10px", textAlign: "left", fontSize: "13px" }}>ป้ายทะเบียน</th>
                <th style={{ padding: "10px", textAlign: "center", fontSize: "13px" }}>ที่นั่ง</th>
                <th style={{ padding: "10px", textAlign: "center", fontSize: "13px" }}>จัดการ</th>
                <th style={{ padding: "10px", textAlign: "center", fontSize: "13px" }}>สถานะ</th> 
              </tr>
            </thead>
            <tbody>
              {vehicles.map(car => (
                <tr key={car.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px" }}>
                    {car.image ? (
                      <img src={car.image} alt={car.model} style={{ width: "50px", height: "35px", objectFit: "cover", borderRadius: "4px", border: "1px solid #e5e7eb" }} />
                    ) : (
                      <div style={{ width: "50px", height: "35px", backgroundColor: "#f3f4f6", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#9ca3af" }}>ไม่มีรูป</div>
                    )}
                  </td>
                  <td style={{ padding: "10px", fontSize: "13px", fontWeight: "700", color: "#D97706" }}>{car.id.toUpperCase()}</td>
                  <td style={{ padding: "10px", fontSize: "13px", fontWeight: "600" }}>{car.model}</td>
                  <td style={{ padding: "10px", fontSize: "13px" }}>{car.plate}</td>
                  <td style={{ padding: "10px", textAlign: "center", fontSize: "13px" }}>{car.seats} ที่นั่ง</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <button onClick={() => startEditCar(car)} style={{ marginRight: "8px", color: "#2563EB", border: "none", background: "none", cursor: "pointer" }}><Edit3 size={15} /></button>
                    <button onClick={() => handleDeleteVehicle(car.id)} style={{ color: "#EF4444", border: "none", background: "none", cursor: "pointer" }}><Trash2 size={15} /></button>
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <select
                      value={car.status || "available"}
                      onChange={async (e) => {
                        const nextStatus = e.target.value;
                        try {
                          const res = await fetch(`http://localhost:5000/api/vehicles/${car.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              model: car.model,
                              plate: car.plate,
                              seats: car.seats,
                              image: car.image,
                              status: nextStatus 
                            })
                          });
                          if (res.ok) {
                            alert(`🎯 สลับสถานะรถรหัส ${car.id.toUpperCase()} เป็น [ ${nextStatus === 'available' ? 'พร้อมใช้งาน' : 'งดใช้งาน'} ] เรียบร้อย!`);
                            fetchVehicles(); 
                          }
                        } catch (err) { console.error(err); }
                      }}
                      style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", border: "1px solid", borderColor: car.status === "maintenance" ? "#fca5a5" : "#a7f3d0", backgroundColor: car.status === "maintenance" ? "#fef2f2" : "#ecfdf5", color: car.status === "maintenance" ? "#dc2626" : "#065f46", cursor: "pointer", outline: "none", WebkitAppearance: "none", appearance: "none", textAlign: "center" }}
                    >
                      <option value="available">พร้อมใช้งาน</option>
                      <option value="maintenance">🛠️ ชำรุด / งดใช้งาน</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== แท็บที่ 3: ตารางประวัติการจองรถทั้งหมดของทุกคน (Admin) ==================== */}
      {activeSubTab === "all_bookings" && (
        <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", overflowX: "auto" }}>
          <h3 style={{ margin: "0 0 12px 0", color: "#374151" }}>สมุดประวัติคิวจองรถยนต์ของพนักงานทุกคนในระบบ</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "10px", textAlign: "left", fontSize: "13px" }}>รหัสคิว</th>
                <th style={{ padding: "10px", textAlign: "left", fontSize: "13px" }}>ชื่อผู้จองใช้งาน</th>
                <th style={{ padding: "10px", textAlign: "left", fontSize: "13px" }}>ยานพาหนะที่ใช้</th>
                <th style={{ padding: "10px", textAlign: "center", fontSize: "13px" }}>วันที่เริ่ม</th>
                <th style={{ padding: "10px", textAlign: "center", fontSize: "13px" }}>วันที่สิ้นสุด</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: "14px" }}>ยังไม่มีประวัติการจองคิว</td>
                </tr>
              ) : (
                bookings.map(b => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}>
                    <td style={{ padding: "12px", fontWeight: "700", color: "#1e3a8a" }}>BOOK-{b.id}</td>
                   <td style={{ padding: "12px", fontWeight: "600" }}>
  {(() => {
    // 💡 ค้นหาชื่อภาษาไทยของพนักงานคนนี้จากอาร์เรย์ employees ที่มีอยู่ในหน้าจออยู่แล้วคัป
    const matchUser = employees.find(emp => emp.id?.toLowerCase().trim() === b.borrower?.toLowerCase().trim());
    
    if (b.borrower?.toLowerCase().trim() === 'admin') {
      return "ผู้ดูแลระบบสูงสุด";
    }
    // 💡 ถ้าเจอชื่อจริงในระบบพนักงานให้เอาชื่อไทยมาโชว์ทันที ถ้าไม่เจอค่อยดึงรหัสอังกฤษมาแก้ขัดคัป
    return matchUser ? matchUser.name : (b.borrower_real_name || b.borrower);
  })()}
</td> 
                    <td style={{ padding: "12px", color: "#4b5563" }}>{b.vehicle_model}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>{new Date(b.start_date).toLocaleDateString('th-TH')}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>{new Date(b.end_date).toLocaleDateString('th-TH')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== 📦 [POPUP MODAL]: ฟอร์มพนักงาน ==================== */}
      {isEmpModalOpen && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="fg-rise" style={{ backgroundColor: "#fff", padding: "24px", borderRadius: "12px", width: "90%", maxWidth: "500px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "#1e3a8a", fontSize: "18px" }}>{editingEmpId ? "✏️ แก้ไขข้อมูลบัญชีพนักงาน" : "✨ เพิ่มบัญชีผู้ใช้งานใหม่"}</h3>
              <button onClick={closeEmpModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEmployee} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>รหัสพนักงาน / Username</label>
                <input type="text" value={empForm.id} onChange={e => setEmpForm({...empForm, id: e.target.value})} placeholder="เช่น EMP-1099" required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>ชื่อ-นามสกุล</label>
                <input type="text" value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} placeholder="ชื่อจริง-นามสกุล" required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>แผนก</label>
                  <input type="text" value={empForm.dept} onChange={e => setEmpForm({...empForm, dept: e.target.value})} placeholder="เช่น ฝ่ายบัญชี" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>ตำแหน่งสิทธิ์ (Role)</label>
                  <select value={empForm.role} onChange={e => setEmpForm({...empForm, role: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box", backgroundColor: "#fff" }}>
                    <option value="employee">พนักงาน (Employee)</option>
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>รหัสผ่านความปลอดภัย</label>
                <input type="text" value={empForm.password} onChange={e => setEmpForm({...empForm, password: e.target.value})} required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px", justifyContent: "flex-end" }}>
                <button type="button" onClick={closeEmpModal} style={{ padding: "10px 16px", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontWeight: "600", color: "#4b5563" }}>ยกเลิก</button>
                <button type="submit" style={{ padding: "10px 24px", backgroundColor: "#10B981", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer" }}>บันทึกข้อมูลพนักงาน</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 📦 [POPUP MODAL]: ฟอร์มรถยนต์ ==================== */}
      {isCarModalOpen && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="fg-rise" style={{ backgroundColor: "#fff", padding: "24px", borderRadius: "12px", width: "90%", maxWidth: "550px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "#1e3a8a", fontSize: "18px" }}>{editingCarId ? "✏️ แก้ไขข้อมูลสเปครถยนต์" : "✨ ลงทะเบียนเพิ่มรถคันใหม่"}</h3>
              <button onClick={closeCarModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveVehicle} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>สถานะความพร้อม</label>
                <select value={carForm.status} onChange={e => setCarForm({...carForm, status: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box", backgroundColor: "#fff", fontWeight: "600" }}>
                  <option value="available">🟢 พร้อมใช้งาน</option>
                  <option value="maintenance">🔴 งดใช้งาน (ชำรุด)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>รหัสรถยนต์ (ID คีย์ตรงหลังบ้าน)</label>
                <input type="text" value={carForm.id} onChange={e => setCarForm({...carForm, id: e.target.value})} placeholder="เช่น v5" disabled={!!editingCarId} required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>รุ่นยานพาหนะ</label>
                <input type="text" value={carForm.model} onChange={e => setCarForm({...carForm, model: e.target.value})} placeholder="เช่น Toyota Revo" required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>ป้ายทะเบียน</label>
                <input type="text" value={carForm.plate} onChange={e => setCarForm({...carForm, plate: e.target.value})} placeholder="เช่น 3กข-4567 กทม." required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>ความจุที่นั่ง</label>
                <input type="number" value={carForm.seats} onChange={e => setCarForm({...carForm, seats: parseInt(e.target.value)})} required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }} />
              </div>
              
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>อัปเลือตรูปภาพจากคอมพิวเตอร์ของคุณ</label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                  <label htmlFor="carImageFileInput" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#4b5563" }}>
                    <Upload size={15} /> คลิกเลือกไฟล์...
                  </label>
                  <input id="carImageFileInput" type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files[0])} style={{ display: "none" }} />
                  <span style={{ fontSize: "12px", color: selectedFile ? "#10B981" : "#6b7280" }}>
                    {selectedFile ? `📂 ไฟล์: ${selectedFile.name}` : (carForm.image ? "🖼️ มีรูปเดิมอยู่แล้ว" : "❌ ไม่มีไฟล์")}
                  </span>
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" onClick={closeCarModal} style={{ padding: "10px 16px", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontWeight: "600", color: "#4b5563" }}>ยกเลิก</button>
                <button type="submit" style={{ padding: "10px 24px", backgroundColor: "#F59E0B", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer" }}>บันทึกข้อมูลรถยนต์</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </MainLayout>
  );
}