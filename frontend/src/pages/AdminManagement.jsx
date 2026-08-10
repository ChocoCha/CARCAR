import { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { User, Car, Plus, Trash2, Edit3, X, Upload, Layers } from "lucide-react";
import "../styles/admin.css";

export default function AdminManagement({ onNavigate }) {
  const [activeSubTab, setActiveSubTab] = useState("employees"); 
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);

  // 🟢 ดึง Host IP อัตโนมัติ รองรับการเชื่อมต่อผ่าน IP
  const API_BASE = `http://${window.location.hostname}:5000/api`;

  // 🟢 Helper แปลง Path รูปภาพให้ต่อ IP สมบูรณ์
  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath;
    return `http://${window.location.hostname}:5000${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
  };

  // State ติ๊กเลือก Checkbox รายการจอง
  const [selectedBookingIds, setSelectedBookingIds] = useState([]);

  // UI Control Modals
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);

  // State ฟอร์มพนักงาน
  const [empForm, setEmpForm] = useState({ id: "", name: "", dept: "", password: "1234", role: "employee" });
  const [editingEmpId, setEditingEmpId] = useState(null);

  // State ฟอร์มรถยนต์
  const [carForm, setCarForm] = useState({ 
    id: "", 
    model: "", 
    plate: "", 
    seats: 4, 
    image: "", 
    status: "available",
    act_number: "",
    act_expiry_date: ""
  });
  const [selectedFile, setSelectedFile] = useState(null); 
  const [editingCarId, setEditingCarId] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  function loadData() {
    if (activeSubTab === "employees") fetchEmployees();
    if (activeSubTab === "vehicles") fetchVehicles();
    if (activeSubTab === "all_bookings") {
      fetchAllBookings();
      fetchEmployees();
    }
  }

  // ==================== [ API: พนักงาน ] ====================
  async function fetchEmployees() {
    try {
      const res = await fetch(`${API_BASE}/employees`);
      if (res.ok) setEmployees(await res.json());
    } catch (err) { console.error(err); }
  }

  async function handleSaveEmployee(e) {
    e.preventDefault();
    const isEdit = !!editingEmpId;
    const url = isEdit ? `${API_BASE}/employees/${editingEmpId}` : `${API_BASE}/employees`;
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
    const res = await fetch(`${API_BASE}/employees/${id}`, { method: "DELETE" });
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
    try {
      const res = await fetch(`${API_BASE}/vehicles`);
      if (res.ok) setVehicles(await res.json());
    } catch (err) { console.error(err); }
  }

  async function handleSaveVehicle(e) {
    e.preventDefault();
    const isEdit = !!editingCarId;
    const url = isEdit ? `${API_BASE}/vehicles/${editingCarId}` : `${API_BASE}/vehicles`;
    const method = isEdit ? "PUT" : "POST";

    const formData = new FormData();
    formData.append("id", carForm.id);
    formData.append("model", carForm.model);
    formData.append("plate", carForm.plate);
    formData.append("seats", carForm.seats);
    formData.append("status", carForm.status);
    formData.append("image", carForm.image || ""); 
    
    formData.append("act_number", carForm.act_number || "");
    formData.append("act_expiry_date", carForm.act_expiry_date || "");
    
    if (selectedFile) {
      formData.append("imageFile", selectedFile);
    }

    const res = await fetch(url, { method, body: formData });

    if (res.ok) {
      alert(isEdit ? "🎯 แก้ไขสเปครถและบันทึกรูปสำเร็จ!" : "✨ ลงทะเบียนยานพาหนะสำเร็จ!");
      setSelectedFile(null);
      closeCarModal();
      fetchVehicles();
    } else {
      const errData = await res.json();
      alert(errData.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  }

  async function handleDeleteVehicle(id) {
    if (!confirm(`ยืนยันลบรถรหัส ${id} ออกจากระบบ?`)) return;
    const res = await fetch(`${API_BASE}/vehicles/${id}`, { method: "DELETE" });
    if (res.ok) { fetchVehicles(); alert("ลบสำเร็จ"); }
  }

  async function handleStatusChange(car, nextStatus) {
    try {
      const res = await fetch(`${API_BASE}/vehicles/${car.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: car.model,
          plate: car.plate,
          seats: car.seats,
          image: car.image,
          status: nextStatus,
          act_number: car.act_number || "",
          act_expiry_date: car.act_expiry_date ? car.act_expiry_date.split("T")[0] : ""
        })
      });

      if (res.ok) {
        alert(`🎯 สลับสถานะรถรหัส ${car.id.toUpperCase()} เรียบร้อย!`);
        fetchVehicles(); 
      } else {
        const err = await res.json();
        alert(`❌ เปลี่ยนสถานะไม่สำเร็จ: ${err.message || err.error}`);
      }
    } catch (err) { 
      console.error("Error updating status:", err); 
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลังบ้านได้");
    }
  }

  function startEditCar(car) {
    setEditingCarId(car.id);
    setCarForm({ 
      id: car.id, 
      model: car.model, 
      plate: car.plate, 
      seats: car.seats, 
      image: car.image || "", 
      status: car.status || "available",
      act_number: car.act_number || "",
      act_expiry_date: car.act_expiry_date ? car.act_expiry_date.split("T")[0] : ""
    });
    setSelectedFile(null);
    setIsCarModalOpen(true);
  }

  function closeCarModal() {
    setIsCarModalOpen(false);
    setEditingCarId(null);
    setCarForm({ id: "", model: "", plate: "", seats: 4, image: "", status: "available", act_number: "", act_expiry_date: "" });
    setSelectedFile(null);
  }

  // ==================== [ API: ประวัติการจอง & การลบ ] ====================
  async function fetchAllBookings() {
    try {
      const res = await fetch(`${API_BASE}/bookings?role=admin`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
        setSelectedBookingIds([]);
      }
    } catch (err) {
      console.error("ดึงข้อมูลคิวรวมไม่สำเร็จ:", err);
    }
  }

  async function handleDeleteSingleBooking(id) {
    if (!confirm(`ยืนยันลบประวัติการจองรหัส BOOK-${id}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/bookings/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("🗑️ ลบประวัติการจองเรียบร้อยแล้ว");
        fetchAllBookings();
      }
    } catch (err) { console.error(err); }
  }

  async function handleDeleteBatchBookings() {
    if (selectedBookingIds.length === 0) return;
    if (!confirm(`ยืนยันลบประวัติการจองที่เลือกไว้จำนวน ${selectedBookingIds.length} รายการ?`)) return;

    try {
      const res = await fetch(`${API_BASE}/bookings/delete-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedBookingIds })
      });
      if (res.ok) {
        alert(`🗑️ ลบประวัติการจองจำนวน ${selectedBookingIds.length} รายการเรียบร้อยแล้ว!`);
        fetchAllBookings();
      }
    } catch (err) { console.error(err); }
  }

  function toggleSelectAllBookings() {
    if (selectedBookingIds.length === bookings.length) {
      setSelectedBookingIds([]);
    } else {
      setSelectedBookingIds(bookings.map(b => b.id));
    }
  }

  function toggleSelectBooking(id) {
    if (selectedBookingIds.includes(id)) {
      setSelectedBookingIds(selectedBookingIds.filter(item => item !== id));
    } else {
      setSelectedBookingIds([...selectedBookingIds, id]);
    }
  }

  const getSafeDateStr = (dateInput) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getSafeDateStr(new Date());

  return (
    <MainLayout activePage="admin-panel" onNavigate={onNavigate} title="🛠️ ระบบผู้ดูแลระบบ (Admin Panel)" subtitle="บริหารจัดการบัญชีผู้ใช้ คลังยานพาหนะ และสมุดประวัติการจอง">
      
      {/* 🟢 ส่วนแถบแท็บและปุ่มเพิ่ม */}
      <div className="admin-tab-container">
        <div className="admin-tabs">
          <button onClick={() => setActiveSubTab("employees")} className={`admin-tab-btn ${activeSubTab === "employees" ? "is-active" : ""}`}>
            <User size={16} /> จัดการบัญชีพนักงาน
          </button>
          <button onClick={() => setActiveSubTab("vehicles")} className={`admin-tab-btn ${activeSubTab === "vehicles" ? "is-active" : ""}`}>
            <Car size={16} /> จัดการคลังยานพาหนะ
          </button>
          <button onClick={() => setActiveSubTab("all_bookings")} className={`admin-tab-btn ${activeSubTab === "all_bookings" ? "is-active" : ""}`}>
            <Layers size={16} /> ตรวจสอบประวัติจองรถทั้งหมด
          </button>
        </div>

        {activeSubTab === "employees" && (
          <button onClick={() => setIsEmpModalOpen(true)} className="admin-add-btn btn-emp">
            <Plus size={16} /> เพิ่มบัญชีพนักงานใหม่
          </button>
        )}
        {activeSubTab === "vehicles" && (
          <button onClick={() => setIsCarModalOpen(true)} className="admin-add-btn btn-car">
            <Plus size={16} /> ลงทะเบียนรถใหม่
          </button>
        )}
      </div>

      {/* 🟢 แท็บที่ 1: ตารางพนักงาน */}
      {activeSubTab === "employees" && (
        <div className="admin-table">
          <h3 style={{ margin: "0 0 12px 0", color: "#374151" }}>รายชื่อบัญชีผู้ใช้</h3>
          <table className="emp-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>ID</th>
                <th style={{ textAlign: "left" }}>ชื่อ-นามสกุล</th>
                <th style={{ textAlign: "left" }}>แผนก</th>
                <th style={{ textAlign: "center" }}>สิทธิ์</th>
                <th style={{ textAlign: "center" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: "600" }}>{emp.id}</td>
                  <td>{emp.name}</td>
                  <td style={{ color: "#4b5563" }}>{emp.dept}</td>
                  <td style={{ textAlign: "center" }}>
                    <span className="emp-role-badge" style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "999px", backgroundColor: emp.role === "admin" ? "#FEF3C7" : "#E0F2FE", color: emp.role === "admin" ? "#92400E" : "#0369A1", fontWeight: "bold" }}>
                      {emp.role}
                    </span>
                  </td>
                  <td>
                    <div className="action-cell">
                      <button onClick={() => startEditEmp(emp)} className="action-btn btn-edit" title="แก้ไข"><Edit3 size={15} /></button>
                      <button onClick={() => handleDeleteEmployee(emp.id)} className="action-btn btn-delete" title="ลบ"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 🟢 แท็บที่ 2: ตารางยานพาหนะ */}
      {activeSubTab === "vehicles" && (
        <div className="admin-table">
          <h3 style={{ margin: "0 0 12px 0", color: "#374151" }}>คลังรถยนต์บริษัท</h3>
          <table className="vehicle-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>รูป</th>
                <th style={{ textAlign: "left" }}>รุ่นรถ / ทะเบียน</th>
                <th style={{ textAlign: "center" }}>ที่นั่ง</th>
                <th style={{ textAlign: "center" }}>สถานะ</th>
                <th style={{ textAlign: "center" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(car => (
                <tr key={car.id}>
                  <td>
                    {car.image ? (
                      <img 
                        src={getImageUrl(car.image)} 
                        alt={car.model} 
                        className="vehicle-img"
                        onError={(e) => {
                          e.target.onerror = null; 
                          e.target.src = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=300";
                        }}
                      />
                    ) : (
                      <div className="vehicle-img-placeholder">ไม่มีรูป</div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: "700", color: "#111827", fontSize: "13px" }}>{car.model}</div>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>{car.plate} ({car.id.toUpperCase()})</div>
                  </td>
                  <td style={{ textAlign: "center" }}>{car.seats}</td>
                  <td style={{ textAlign: "center" }}>
                    <select
                      value={car.status || "available"}
                      onChange={(e) => handleStatusChange(car, e.target.value)}
                      style={{ padding: "4px 6px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", border: "1px solid", borderColor: car.status === "maintenance" ? "#fca5a5" : "#a7f3d0", backgroundColor: car.status === "maintenance" ? "#fef2f2" : "#ecfdf5", color: car.status === "maintenance" ? "#dc2626" : "#065f46" }}
                    >
                      <option value="available">พร้อม</option>
                      <option value="maintenance">🛠️ ชำรุด</option>
                    </select>
                  </td>
                  <td>
                    <div className="action-cell">
                      <button onClick={() => startEditCar(car)} className="action-btn btn-edit"><Edit3 size={15} /></button>
                      <button onClick={() => handleDeleteVehicle(car.id)} className="action-btn btn-delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 🟢 แท็บที่ 3: สมุดประวัติคิวจองรถยนต์ทั้งหมด */}
      {activeSubTab === "all_bookings" && (
        <div className="admin-table">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0, color: "#374151" }}>สมุดประวัติคิวจองรถยนต์</h3>
            
            {selectedBookingIds.length > 0 && (
              <button
                onClick={handleDeleteBatchBookings}
                style={{ padding: "8px 16px", backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Trash2 size={14} /> ลบที่เลือก ({selectedBookingIds.length})
              </button>
            )}
          </div>

          <table className="booking-table">
            <thead>
              <tr>
                <th style={{ textAlign: "center", width: "30px" }}>
                  <input
                    type="checkbox"
                    checked={bookings.length > 0 && selectedBookingIds.length === bookings.length}
                    onChange={toggleSelectAllBookings}
                    style={{ cursor: "pointer", width: "15px", height: "15px" }}
                  />
                </th>
                <th style={{ textAlign: "left" }}>ข้อมูลการจอง</th>
                <th style={{ textAlign: "center" }}>ช่วงวันที่</th>
                <th style={{ textAlign: "center" }}>สถานะ</th>
                <th style={{ textAlign: "center" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>ยังไม่มีประวัติการจองคิวในระบบ</td>
                </tr>
              ) : (
                bookings.map(b => {
                  const isChecked = selectedBookingIds.includes(b.id);
                  const endDateStr = getSafeDateStr(b.end_date);
                  const isCancelled = b.status === 'cancelled';
                  const isExpired = endDateStr < todayStr;

                  return (
                    <tr key={b.id} style={{ backgroundColor: isChecked ? "#FEF2F2" : "transparent" }}>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectBooking(b.id)}
                          style={{ cursor: "pointer", width: "15px", height: "15px" }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: "700", color: "#1e3a8a", fontSize: "12px" }}>BOOK-{b.id}</div>
                        <div style={{ fontWeight: "600", fontSize: "13px", color: "#111827" }}>
                          {(() => {
                            const matchUser = employees.find(emp => emp.id?.toLowerCase().trim() === b.borrower?.toLowerCase().trim());
                            if (b.borrower?.toLowerCase().trim() === 'admin') return "ผู้ดูแลระบบสูงสุด";
                            return matchUser ? matchUser.name : (b.borrower_real_name || b.borrower);
                          })()}
                        </div>
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>{b.vehicle_model}</div>
                      </td>
                      <td style={{ textAlign: "center", fontSize: "11px", color: "#374151" }}>
                        <div>{new Date(b.start_date).toLocaleDateString('th-TH')}</div>
                        <div style={{ color: "#9ca3af" }}>ถึง</div>
                        <div>{new Date(b.end_date).toLocaleDateString('th-TH')}</div>
                      </td>
                      
                      <td style={{ textAlign: "center" }}>
                        {isCancelled ? (
                          <span style={{ fontSize: "10px", padding: "3px 6px", borderRadius: "999px", backgroundColor: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", fontWeight: "bold" }}>
                            ❌ ยกเลิก
                          </span>
                        ) : isExpired ? (
                          <span style={{ fontSize: "10px", padding: "3px 6px", borderRadius: "999px", backgroundColor: "#F3F4F6", color: "#4B5563", border: "1px solid #D1D5DB", fontWeight: "bold" }}>
                            🏁 ครบกำหนด
                          </span>
                        ) : (
                          <span style={{ fontSize: "10px", padding: "3px 6px", borderRadius: "999px", backgroundColor: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", fontWeight: "bold" }}>
                            🟢 ปกติ
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="action-cell">
                          <button
                            onClick={() => handleDeleteSingleBooking(b.id)}
                            title="ลบประวัตินี้"
                            className="action-btn btn-delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* POPUP MODAL: ฟอร์มพนักงาน */}
      {isEmpModalOpen && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="fg-rise" style={{ backgroundColor: "#fff", padding: "24px", borderRadius: "12px", width: "90%", maxWidth: "500px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "#1e3a8a", fontSize: "18px" }}>{editingEmpId ? "✏️ แก้ไขข้อมูลบัญชีพนักงาน" : "✨ เพิ่มบัญชีผู้ใช้งานใหม่"}</h3>
              <button onClick={closeEmpModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEmployee} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              
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
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>ชื่อผู้ใช้งาน / Username</label>
                <input type="text" value={empForm.id} onChange={e => setEmpForm({...empForm, id: e.target.value})} placeholder="เช่น EMP-1099" required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>รหัสผ่าน</label>
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

      {/* 🟢 POPUP MODAL: ฟอร์มรถยนต์ */}
      {isCarModalOpen && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="fg-rise" style={{ backgroundColor: "#fff", padding: "24px", borderRadius: "12px", width: "90%", maxWidth: "550px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
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
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>ความจุที่นั่ง</label>
                <input type="number" value={carForm.seats} onChange={e => setCarForm({...carForm, seats: parseInt(e.target.value) || 0})} required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }} />
              </div>

              {/* ฟิลด์เลข พ.ร.บ. */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px", color: "#1e3a8a" }}>เลขที่ พ.ร.บ.</label>
                <input type="text" value={carForm.act_number} onChange={e => setCarForm({...carForm, act_number: e.target.value})} placeholder="เช่น ACT-998877" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }} />
              </div>

              {/* ฟิลด์วันหมดอายุ พ.ร.บ. */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px", color: "#1e3a8a" }}>วันหมดอายุ พ.ร.บ.</label>
                <input type="date" value={carForm.act_expiry_date} onChange={e => setCarForm({...carForm, act_expiry_date: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box" }} />
              </div>
              
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "4px" }}>อัปโหลดรูปภาพจากคอมพิวเตอร์ของคุณ</label>
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