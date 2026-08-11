import { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { User, Car, Plus, Trash2, Edit3, X, Upload, Layers } from "lucide-react";
import "../styles/admin.css";

export default function AdminManagement({ onNavigate }) {
  const [activeSubTab, setActiveSubTab] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);

  const API_BASE = `http://${window.location.hostname}:5000/api`;

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath;
    return `http://${window.location.hostname}:5000${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
  };

  const [selectedBookingIds, setSelectedBookingIds] = useState([]);

  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);

  const [empForm, setEmpForm] = useState({ id: "", name: "", dept: "", password: "1234", role: "employee" });
  const [editingEmpId, setEditingEmpId] = useState(null);

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
      alert(isEdit ? "อัปเดตข้อมูลบัญชีพนักงานสำเร็จ!" : "เพิ่มบัญชีผู้ใช้สำเร็จ!");
      closeEmpModal();
      fetchEmployees();
    }
  }

  async function handleDeleteEmployee(id) {
    if (!confirm(`ยืนยันลบบัญชีพนักงาน ${id}?`)) return;
    const res = await fetch(`${API_BASE}/employees/${id}`, { method: "DELETE" });
    if (res.ok) { fetchEmployees(); alert("ลบข้อมูลสำเร็จ!"); }
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

  // ==================== [ API: รถยนต์ ] ====================
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
      alert(isEdit ? "แก้ไขข้อมูลรถยนต์สำเร็จ" : "ลงทะเบียนรถยนต์สำเร็จ");
      setSelectedFile(null);
      closeCarModal();
      fetchVehicles();
    } else {
      const errData = await res.json();
      alert(errData.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  }

  // 🟢 ปรับเปลี่ยนแจ้งเตือนลบรถ ให้ขึ้นชื่อรุ่นและป้ายทะเบียน
  async function handleDeleteVehicle(car) {
    const carName = typeof car === 'object' ? `${car.model} (${car.plate})` : car;
    const carId = typeof car === 'object' ? car.id : car;

    if (!confirm(`ยืนยันการลบรถยนต์ [ ${carName} ] ออกจากระบบใช่หรือไม่?`)) return;

    try {
      const res = await fetch(`${API_BASE}/vehicles/${encodeURIComponent(carId)}`, { method: "DELETE" });
      if (res.ok) {
        fetchVehicles();
        alert("ลบข้อมูลรถยนต์สำเร็จ!");
      } else {
        const errData = await res.json();
        alert(`ลบไม่สำเร็จ: ${errData.message || errData.error}`);
      }
    } catch (err) {
      console.error("Delete Error:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
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
        alert(`สลับสถานะรถ ${car.model} เรียบร้อย!`);
        fetchVehicles();
      } else {
        const err = await res.json();
        alert(`เปลี่ยนสถานะไม่สำเร็จ: ${err.message || err.error}`);
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

  // 🟢 เรียงลำดับตารางตาม ID การจอง จากมากไปน้อย (ล่าสุดขึ้นบนสุดเสมอ)
  const sortedBookings = [...bookings].sort((a, b) => Number(b.id) - Number(a.id));

  return (
    <MainLayout activePage="admin-panel" onNavigate={onNavigate} title="🛠️ ระบบผู้ดูแลระบบ (Admin Panel)" subtitle="บริหารจัดการบัญชีผู้ใช้ คลังรถยนต์และประวัติการจอง">

      <div className="admin-tab-container">
        <div className="admin-tabs">
          <button onClick={() => setActiveSubTab("employees")} className={`admin-tab-btn ${activeSubTab === "employees" ? "is-active" : ""}`}>
            <User size={16} /> จัดการบัญชีพนักงาน
          </button>
          <button onClick={() => setActiveSubTab("vehicles")} className={`admin-tab-btn ${activeSubTab === "vehicles" ? "is-active" : ""}`}>
            <Car size={16} /> จัดการคลังรถยนต์
          </button>
          <button onClick={() => setActiveSubTab("all_bookings")} className={`admin-tab-btn ${activeSubTab === "all_bookings" ? "is-active" : ""}`}>
            <Layers size={16} /> ตรวจสอบประวัติจองรถทั้งหมด
          </button>
        </div>

        {activeSubTab === "employees" && (
          <button onClick={() => setIsEmpModalOpen(true)} className="admin-add-btn btn-emp">
            <Plus size={16} /> เพิ่มบัญชีพนักงาน
          </button>
        )}
        {activeSubTab === "vehicles" && (
          <button onClick={() => setIsCarModalOpen(true)} className="admin-add-btn btn-car">
            <Plus size={16} /> เพิ่มรถยนต์
          </button>
        )}
      </div>

      {activeSubTab === "employees" && (
        <div className="admin-table">
          <h3 className="admin-section-title">รายชื่อบัญชีผู้ใช้</h3>
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
                  <td data-label="ID" style={{ fontWeight: "600" }}>{emp.id}</td>
                  <td data-label="ชื่อ-นามสกุล">{emp.name}</td>
                  <td data-label="แผนก" style={{ color: "var(--ink-soft)" }}>{emp.dept}</td>
                  <td data-label="สิทธิ์" style={{ textAlign: "center" }}>
                    <span className={`admin-role-badge ${emp.role === "admin" ? "is-admin" : "is-employee"}`}>
                      {emp.role}
                    </span>
                  </td>
                  <td data-label="จัดการ">
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

      {activeSubTab === "vehicles" && (
        <div className="admin-table">
          <h3 className="admin-section-title">คลังรถยนต์บริษัท</h3>
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
                  <td data-label="รูป">
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
                  <td data-label="รุ่นรถ / ทะเบียน">
                    <div style={{ fontWeight: "700", color: "var(--ink)", fontSize: "13px" }}>{car.model}</div>
                    <div style={{ fontSize: "11px", color: "var(--stone)" }}>{car.plate} ({car.id.toUpperCase()})</div>
                  </td>
                  <td data-label="ที่นั่ง" style={{ textAlign: "center" }}>{car.seats}</td>
                  <td data-label="สถานะ" style={{ textAlign: "center" }}>
                    <select
                      value={car.status || "available"}
                      onChange={(e) => handleStatusChange(car, e.target.value)}
                      className={`admin-status-select ${car.status === "maintenance" ? "is-maintenance" : "is-available"}`}
                    >
                      <option value="available">พร้อม</option>
                      <option value="maintenance">ชำรุด</option>
                    </select>
                  </td>
                  <td data-label="จัดการ">
                    <div className="action-cell">
                      <button onClick={() => startEditCar(car)} className="action-btn btn-edit"><Edit3 size={15} /></button>
                      <button onClick={() => handleDeleteVehicle(car)} className="action-btn btn-delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === "all_bookings" && (
        <div className="admin-table">
          <div className="admin-batch-bar">
            <h3 className="admin-section-title" style={{ margin: 0 }}>ประวัติคิวจองรถยนต์</h3>

            {selectedBookingIds.length > 0 && (
              <button onClick={handleDeleteBatchBookings} className="admin-batch-delete-btn">
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
                    className="admin-checkbox"
                  />
                </th>
                <th style={{ textAlign: "left" }}>ข้อมูลการจอง</th>
                <th style={{ textAlign: "center" }}>ช่วงวันที่</th>
                <th style={{ textAlign: "center" }}>สถานะ</th>
                <th style={{ textAlign: "center" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {sortedBookings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="admin-empty-cell">ยังไม่มีประวัติการจองคิวในระบบ</td>
                </tr>
              ) : (
                sortedBookings.map(b => {
                  const isChecked = selectedBookingIds.includes(b.id);
                  const startDateStr = getSafeDateStr(b.start_date);
                  const endDateStr = getSafeDateStr(b.end_date);
                  const isCancelled = b.status === 'cancelled';
                  const isExpired = endDateStr < todayStr;
                  const isCurrentlyActive = b.vehicle_id && !isCancelled && endDateStr >= todayStr && startDateStr <= todayStr;

                  return (
                    <tr key={b.id} className={`admin-booking-row ${isChecked ? "is-selected" : ""} ${isCurrentlyActive ? "is-active-row" : ""}`}>
                      <td data-label="เลือก" style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectBooking(b.id)}
                          className="admin-checkbox"
                        />
                      </td>
                      <td data-label="ข้อมูลการจอง">
                        <div className="admin-booking-code">BOOK-{b.id}</div>
                        <div className="admin-booking-user">
                          {(() => {
                            const matchUser = employees.find(emp => emp.id?.toLowerCase().trim() === b.borrower?.toLowerCase().trim());
                            return b.borrower_real_name || (matchUser ? matchUser.name : b.borrower);
                          })()}
                        </div>
                        <div className="admin-booking-vehicle">{b.vehicle_model}</div>
                      </td>
                      <td data-label="ช่วงวันที่" className="admin-date-cell">
                        <div>{new Date(b.start_date).toLocaleDateString('th-TH')}</div>
                        <div className="admin-date-sep">ถึง</div>
                        <div>{new Date(b.end_date).toLocaleDateString('th-TH')}</div>
                      </td>

                      <td data-label="สถานะ" style={{ textAlign: "center" }}>
                        {!b.vehicle_id ? (
                          <span className="admin-pill is-neutral" style={{ backgroundColor: "#F3F4F6", color: "#4B5563", border: "1px solid #D1D5DB" }}> ไม่พบข้อมูลรถ (ลบแล้ว)</span>
                        ) : isCancelled ? (
                          <span className="admin-pill is-cancelled">ยกเลิก</span>
                        ) : isCurrentlyActive ? (
                          <span className="admin-pill is-active" style={{ backgroundColor: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", fontWeight: "bold" }}>🟢 ติดจอง (กำลังใช้งาน)</span>
                        ) : isExpired ? (
                          <span className="admin-pill is-expired">ครบกำหนด</span>
                        ) : (
                          <span className="admin-pill is-active">จองล่วงหน้า</span>
                        )}
                      </td>

                      <td data-label="จัดการ">
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

      {isEmpModalOpen && (
        <div className="modal-overlay">
          <div className="fg-rise admin-modal-card" style={{ maxWidth: "500px" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{editingEmpId ? "แก้ไขข้อมูลบัญชีพนักงาน" : "เพิ่มบัญชีผู้ใช้งานใหม่"}</h3>
              <button onClick={closeEmpModal} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEmployee} className="admin-form-col">

              <div className="admin-field">
                <label>ชื่อ-นามสกุล</label>
                <input type="text" value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} placeholder="ชื่อจริง-นามสกุล" required className="admin-input" />
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div className="admin-field" style={{ flex: 1 }}>
                  <label>แผนก</label>
                  <input type="text" value={empForm.dept} onChange={e => setEmpForm({ ...empForm, dept: e.target.value })} placeholder="เช่น ฝ่ายบัญชี" className="admin-input" />
                </div>
                <div className="admin-field" style={{ flex: 1 }}>
                  <label>ตำแหน่งสิทธิ์ (Role)</label>
                  <select value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })} className="admin-select">
                    <option value="employee">พนักงาน (Employee)</option>
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                  </select>
                </div>
              </div>
              <div className="admin-field">
                <label>ชื่อผู้ใช้งาน / Username</label>
                <input type="text" value={empForm.id} onChange={e => setEmpForm({ ...empForm, id: e.target.value })} placeholder="เช่น EMP-1099" required className="admin-input" />
              </div>
              <div className="admin-field">
                <label>รหัสผ่าน</label>
                <input type="text" value={empForm.password} onChange={e => setEmpForm({ ...empForm, password: e.target.value })} required className="admin-input" />
              </div>
              <div className="admin-modal-actions">
                <button type="button" onClick={closeEmpModal} className="admin-btn-cancel">ยกเลิก</button>
                <button type="submit" className="admin-btn-save">บันทึกข้อมูลพนักงาน</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCarModalOpen && (
        <div className="modal-overlay">
          <div className="fg-rise admin-modal-card" style={{ maxWidth: "550px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{editingCarId ? "แก้ไขข้อมูลสเปครถยนต์" : "เพิ่มรถคันใหม่"}</h3>
              <button onClick={closeCarModal} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveVehicle} className="admin-form-grid">
              <div className="admin-field">
                <label>สถานะความพร้อม</label>
                <select value={carForm.status} onChange={e => setCarForm({ ...carForm, status: e.target.value })} className="admin-select">
                  <option value="available">พร้อมใช้งาน</option>
                  <option value="maintenance">ชำรุด</option>
                </select>
              </div>
              <div className="admin-field">
                <label>ID(รถยนต์)</label>
                <input type="text" value={carForm.id} onChange={e => setCarForm({ ...carForm, id: e.target.value })} placeholder="เช่น v5" disabled={!!editingCarId} required className="admin-input" />
              </div>
              <div className="admin-field">
                <label>รุ่นรถยนต์</label>
                <input type="text" value={carForm.model} onChange={e => setCarForm({ ...carForm, model: e.target.value })} placeholder="เช่น Toyota Revo" required className="admin-input" />
              </div>
              <div className="admin-field">
                <label>ป้ายทะเบียน</label>
                <input type="text" value={carForm.plate} onChange={e => setCarForm({ ...carForm, plate: e.target.value })} placeholder="เช่น 3กข-4567 กทม." required className="admin-input" />
              </div>
              <div className="admin-field">
                <label>ความจุที่นั่ง</label>
                <input type="number" value={carForm.seats} onChange={e => setCarForm({ ...carForm, seats: parseInt(e.target.value) || 0 })} required className="admin-input" />
              </div>

              <div className="admin-field">
                <label className="accent">เลขที่ พ.ร.บ.</label>
                <input type="text" value={carForm.act_number} onChange={e => setCarForm({ ...carForm, act_number: e.target.value })} placeholder="เช่น ACT-998877" className="admin-input" />
              </div>

              <div className="admin-field span-2">
                <label className="accent">วันหมดอายุ พ.ร.บ.</label>
                <input type="date" value={carForm.act_expiry_date} onChange={e => setCarForm({ ...carForm, act_expiry_date: e.target.value })} className="admin-input" />
              </div>

              <div className="admin-field span-2">
                <label>อัปโหลดรูปภาพของคุณ</label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                  <label htmlFor="carImageFileInput" className="admin-upload-label">
                    <Upload size={15} /> คลิกเลือกไฟล์...
                  </label>
                  <input id="carImageFileInput" type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files[0])} style={{ display: "none" }} />
                  <span className="admin-upload-filename">
                    {selectedFile ? `📂 ไฟล์: ${selectedFile.name}` : ""}
                  </span>
                </div>
              </div>

              <div className="admin-field span-2 admin-modal-actions" style={{ marginTop: "4px" }}>
                <button type="button" onClick={closeCarModal} className="admin-btn-cancel">ยกเลิก</button>
                <button type="submit" className="admin-btn-save">บันทึกข้อมูลรถยนต์</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </MainLayout>
  );
}