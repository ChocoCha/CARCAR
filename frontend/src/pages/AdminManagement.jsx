import { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { User, Car, Plus, Trash2, Edit3, X, Upload, Layers, AlertTriangle, CheckCircle2, Gauge, MapPin, Briefcase } from "lucide-react";
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

  // State สำหรับป๊อปอัปยืนยันการลบ
  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState(null);

  // State สำหรับ Modal แจ้งเตือนผลการทำงาน (แทน alert)
  const [noticeModal, setNoticeModal] = useState(null);

  const [empForm, setEmpForm] = useState({ id: "", name: "", dept: "", password: "1234", role: "employee" });
  const [editingEmpId, setEditingEmpId] = useState(null);

  const [carForm, setCarForm] = useState({
    id: "",
    model: "",
    plate: "",
    seats: 4,
    mileage: 0, // 🟢 เพิ่มไมล์ในฟอร์มรถ
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

  function showNotice(title, message, isError = false) {
    setNoticeModal({ title, message, isError });
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

    try {
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
        closeEmpModal();
        fetchEmployees();
        showNotice("ทำรายการสำเร็จ", isEdit ? "อัปเดตข้อมูลบัญชีพนักงานเรียบร้อยแล้ว!" : "เพิ่มบัญชีผู้ใช้งานใหม่เรียบร้อยแล้ว!");
      } else {
        const errData = await res.json();
        showNotice("เกิดข้อผิดพลาด", errData.message || "ไม่สามารถบันทึกข้อมูลพนักงานได้", true);
      }
    } catch (err) {
      showNotice("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลังบ้านได้", true);
    }
  }

  function askDeleteEmployee(emp) {
    setDeleteConfirmConfig({
      title: "ยืนยันลบบัญชีพนักงาน",
      message: `คุณต้องการลบบัญชีพนักงาน [ ${emp.name} (${emp.id}) ] ใช่หรือไม่?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/employees/${emp.id}`, { method: "DELETE" });
          if (res.ok) { 
            fetchEmployees(); 
            setDeleteConfirmConfig(null);
            showNotice("ทำรายการสำเร็จ", "ลบบัญชีพนักงานเรียบร้อยแล้ว");
          }
        } catch (err) {
          showNotice("เกิดข้อผิดพลาด", "ไม่สามารถลบข้อมูลพนักงานได้", true);
        }
      }
    });
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
    formData.append("mileage", carForm.mileage || 0); // 🟢 ส่งค่าเลขไมล์
    formData.append("status", carForm.status);
    formData.append("image", carForm.image || "");

    formData.append("act_number", carForm.act_number || "");
    formData.append("act_expiry_date", carForm.act_expiry_date || "");

    if (selectedFile) {
      formData.append("imageFile", selectedFile);
    }

    try {
      const res = await fetch(url, { method, body: formData });

      if (res.ok) {
        setSelectedFile(null);
        closeCarModal();
        fetchVehicles();
        showNotice("ทำรายการสำเร็จ", isEdit ? "แก้ไขข้อมูลรถยนต์เรียบร้อยแล้ว" : "เพิ่มรถยนต์คันใหม่เรียบร้อยแล้ว!");
      } else {
        const errData = await res.json();
        showNotice("เกิดข้อผิดพลาด", errData.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูลรถยนต์", true);
      }
    } catch (err) {
      showNotice("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", true);
    }
  }

  function askDeleteVehicle(car) {
    const carName = typeof car === 'object' ? `${car.model} (${car.plate})` : car;
    const carId = typeof car === 'object' ? car.id : car;

    setDeleteConfirmConfig({
      title: "ยืนยันการลบรถยนต์",
      message: `คุณต้องการลบรถยนต์ [ ${carName} ] ออกจากระบบใช่หรือไม่?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/vehicles/${encodeURIComponent(carId)}`, { method: "DELETE" });
          if (res.ok) {
            fetchVehicles();
            setDeleteConfirmConfig(null);
            showNotice("ทำรายการสำเร็จ", "ลบข้อมูลรถยนต์ออกจากระบบเรียบร้อยแล้ว");
          } else {
            const errData = await res.json();
            showNotice("ลบไม่สำเร็จ", errData.message || errData.error, true);
          }
        } catch (err) {
          console.error("Delete Error:", err);
          showNotice("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", true);
        }
      }
    });
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
          mileage: car.mileage || 0,
          image: car.image,
          status: nextStatus,
          act_number: car.act_number || "",
          act_expiry_date: car.act_expiry_date ? car.act_expiry_date.split("T")[0] : ""
        })
      });

      if (res.ok) {
        fetchVehicles();
        showNotice("อัปเดตสถานะ", `สลับสถานะรถ ${car.model} เรียบร้อยแล้ว`);
      } else {
        const err = await res.json();
        showNotice("สลับสถานะไม่สำเร็จ", err.message || err.error, true);
      }
    } catch (err) {
      showNotice("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลังบ้านได้", true);
    }
  }

  function startEditCar(car) {
    setEditingCarId(car.id);
    setCarForm({
      id: car.id,
      model: car.model,
      plate: car.plate,
      seats: car.seats,
      mileage: car.mileage || 0, // 🟢 ดึงค่าไมล์ปัจจุบันมาแก้ไข
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
    setCarForm({ id: "", model: "", plate: "", seats: 4, mileage: 0, image: "", status: "available", act_number: "", act_expiry_date: "" });
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

  function askDeleteSingleBooking(id) {
    setDeleteConfirmConfig({
      title: "ยืนยันลบประวัติการจอง",
      message: `คุณต้องการลบประวัติการจองรหัส BOOK-${id} ใช่หรือไม่?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/bookings/${id}`, { method: "DELETE" });
          if (res.ok) {
            fetchAllBookings();
            setDeleteConfirmConfig(null);
            showNotice("ทำรายการสำเร็จ", `ลบประวัติการจองรหัส BOOK-${id} เรียบร้อยแล้ว`);
          }
        } catch (err) { console.error(err); }
      }
    });
  }

  function askDeleteBatchBookings() {
    if (selectedBookingIds.length === 0) return;

    setDeleteConfirmConfig({
      title: "ยืนยันลบประวัติแบบกลุ่ม",
      message: `คุณต้องการลบประวัติการจองที่เลือกไว้จำนวน ${selectedBookingIds.length} รายการใช่หรือไม่?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/bookings/delete-batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: selectedBookingIds })
          });
          if (res.ok) {
            fetchAllBookings();
            setDeleteConfirmConfig(null);
            showNotice("ทำรายการสำเร็จ", `ลบประวัติการจองจำนวน ${selectedBookingIds.length} รายการเรียบร้อยแล้ว`);
          }
        } catch (err) { console.error(err); }
      }
    });
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
                      <button onClick={() => askDeleteEmployee(emp)} className="action-btn btn-delete" title="ลบ"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== TAB: คลังรถยนต์ (เพิ่มคอลัมน์ไมล์ล่าสุด) ==================== */}
      {activeSubTab === "vehicles" && (
        <div className="admin-table">
          <h3 className="admin-section-title">คลังรถยนต์บริษัท</h3>
          <table className="vehicle-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>รูป</th>
                <th style={{ textAlign: "left" }}>รุ่นรถ / ทะเบียน</th>
                <th style={{ textAlign: "center" }}>ที่นั่ง</th>
                <th style={{ textAlign: "center" }}>เลขไมล์ที่ใช้งาน</th>
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
                  
                  {/* 🟢 แสดงเลขไมล์สะสมล่าสุดของรถยนต์ */}
                  <td data-label="เลขไมล์ที่ใช้งาน" style={{ textAlign: "center" }}>
                    <span style={{ backgroundColor: "#FEF3C7", color: "#92400E", padding: "4px 8px", borderRadius: "6px", fontWeight: "700", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Gauge size={13} /> {Number(car.mileage || 0).toLocaleString()} ไมล์
                    </span>
                  </td>

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
                      <button onClick={() => startEditCar(car)} className="action-btn btn-edit" title="แก้ไขข้อมูล/เลขไมล์"><Edit3 size={15} /></button>
                      <button onClick={() => askDeleteVehicle(car)} className="action-btn btn-delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== TAB: ประวัติคิวจองรถทั้งหมด (เพิ่มชื่อ, แผนก, โครงการ, ไมล์ก่อนหลัง) ==================== */}
      {activeSubTab === "all_bookings" && (
        <div className="admin-table">
          <div className="admin-batch-bar">
            <h3 className="admin-section-title" style={{ margin: 0 }}>ประวัติคิวจองรถยนต์ทั้งหมด</h3>

            {selectedBookingIds.length > 0 && (
              <button onClick={askDeleteBatchBookings} className="admin-batch-delete-btn">
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
                <th style={{ textAlign: "left" }}>ข้อมูลการจอง & งานโครงการ</th>
                <th style={{ textAlign: "left" }}>บันทึกเลขไมล์ (ก่อน / หลัง)</th>
                <th style={{ textAlign: "center" }}>ช่วงวันที่</th>
                <th style={{ textAlign: "center" }}>สถานะ</th>
                <th style={{ textAlign: "center" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {sortedBookings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="admin-empty-cell">ยังไม่มีประวัติการจองคิวในระบบ</td>
                </tr>
              ) : (
                sortedBookings.map(b => {
                  const isChecked = selectedBookingIds.includes(b.id);
                  const startDateStr = getSafeDateStr(b.start_date);
                  const endDateStr = getSafeDateStr(b.end_date);
                  
                  // ดึงข้อมูลผู้ใช้งานและแผนก
                  const matchUser = employees.find(emp => emp.id?.toLowerCase().trim() === b.borrower?.toLowerCase().trim());
                  const borrowerName = b.borrower_real_name || (matchUser ? matchUser.name : b.borrower);
                  const borrowerDept = b.dept || (matchUser ? matchUser.dept : "ไม่ระบุแผนก");

                  // การคำนวณเลขไมล์
                  const hasStart = b.start_mileage !== null && b.start_mileage !== undefined;
                  const hasReturn = b.returned_mileage !== null && b.returned_mileage !== undefined;
                  const distanceUsed = (hasStart && hasReturn) ? (Number(b.returned_mileage) - Number(b.start_mileage)) : null;

                  // ตรวจสอบสถานะ
                  const isCancelled = b.status === 'cancelled';
                  const isReturned = b.status === 'returned';
                  const isLateReturned = b.status === 'late_returned';
                  const isOverdueUnreturned = b.status === 'active' && endDateStr < todayStr;
                  const isCurrentlyActive = b.status === 'active' && endDateStr >= todayStr && startDateStr <= todayStr;
                  const isFutureBooking = b.status === 'active' && startDateStr > todayStr;

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

                      {/* 🟢 ข้อมูลผู้จอง แผนก รุ่นรถ และงานโครงการ */}
                      <td data-label="ข้อมูลการจอง & งานโครงการ">
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span className="admin-booking-code">BOOK-{b.id}</span>
                          <span style={{ fontWeight: "700", color: "#111827" }}>{borrowerName}</span>
                          <span style={{ fontSize: "11px", color: "#6B7280" }}>({b.borrower})</span>
                        </div>
                        
                        <div style={{ display: "flex", gap: "10px", marginTop: "3px", fontSize: "12px", color: "#4B5563" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <Briefcase size={12} style={{ color: "#2563EB" }} /> {borrowerDept}
                          </span>
                          <span style={{ color: "#9CA3AF" }}>•</span>
                          <span style={{ fontWeight: "600", color: "#D97706" }}>{b.vehicle_model}</span>
                        </div>

                        {b.destination && (
                          <div style={{ marginTop: "3px", fontSize: "11.5px", color: "#DC2626", display: "flex", alignItems: "center", gap: "4px" }}>
                            <MapPin size={12} /> งานโครงการ: <strong>{b.destination}</strong>
                          </div>
                        )}
                      </td>

                      {/* 🟢 ข้อมูลเลขไมล์ก่อนและหลัง พร้อมผลคำนวณสุทธิ */}
                      <td data-label="บันทึกเลขไมล์ (ก่อน / หลัง)">
                        <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ color: "#4B5563" }}>
                            ก่อนไป: <strong>{hasStart ? `${Number(b.start_mileage).toLocaleString()} ไมล์` : "-"}</strong>
                          </div>
                          <div style={{ color: hasReturn ? "#059669" : "#9CA3AF" }}>
                            ตอนคืน: <strong>{hasReturn ? `${Number(b.returned_mileage).toLocaleString()} ไมล์` : "ยังไม่คืน"}</strong>
                          </div>
                          {distanceUsed !== null && (
                            <div style={{ color: "#B45309", fontWeight: "700", borderTop: "1px dashed #E5E7EB", paddingTop: "2px", marginTop: "2px" }}>
                              ใช้จริง: +{distanceUsed.toLocaleString()} ไมล์
                            </div>
                          )}
                        </div>
                      </td>

                      <td data-label="ช่วงวันที่" className="admin-date-cell">
                        <div>{new Date(b.start_date).toLocaleDateString('th-TH')}</div>
                        <div className="admin-date-sep">ถึง</div>
                        <div>{new Date(b.end_date).toLocaleDateString('th-TH')}</div>
                      </td>

                      {/* 🟢 สถานะปรับปรุงตรงตามจริง */}
                      <td data-label="สถานะ" style={{ textAlign: "center" }}>
                        {!b.vehicle_id ? (
                          <span className="admin-pill is-neutral" style={{ backgroundColor: "#F3F4F6", color: "#4B5563", border: "1px solid #D1D5DB" }}>ลบรถแล้ว</span>
                        ) : isCancelled ? (
                          <span className="admin-pill is-cancelled"> ยกเลิกการจอง</span>
                        ) : isLateReturned ? (
                          <span className="admin-pill is-cancelled" style={{ backgroundColor: "#fbfee2", color: "#af9e05d8", border: "1px solid #fafa88", fontWeight: "bold" }}> คืนรถล่าช้า</span>
                        ) : isReturned ? (
                          <span className="admin-pill" style={{ backgroundColor: "#DCFCE7", color: "#15803D", border: "1px solid #86EFAC", fontWeight: "bold" }}>คืนรถเรียบร้อย</span>
                        ) : isOverdueUnreturned ? (
                          <span className="admin-pill" style={{ backgroundColor: "#DC2626", color: "#FFFFFF", fontWeight: "bold" }}>เกินกำหนด (ยังไม่คืน)</span>
                        ) : isCurrentlyActive ? (
                          <span className="admin-pill is-active" style={{ backgroundColor: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", fontWeight: "bold" }}> กำลังใช้งาน</span>
                        ) : isFutureBooking ? (
                          <span className="admin-pill is-active">จองล่วงหน้า</span>
                        ) : (
                          <span className="admin-pill is-expired">ครบกำหนด</span>
                        )}
                      </td>

                      <td data-label="จัดการ">
                        <div className="action-cell">
                          <button
                            onClick={() => askDeleteSingleBooking(b.id)}
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

      {/* ==================== MODAL แจ้งเตือนผล ==================== */}
      {noticeModal && (
        <div className="modal-overlay" onClick={() => setNoticeModal(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3500, backdropFilter: "blur(4px)" }}>
          <div className="fg-rise" style={{ maxWidth: "380px", width: "90%", backgroundColor: "#fff", padding: "24px", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", border: `1px solid ${noticeModal.isError ? "#fee2e2" : "#d1fae5"}` }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", backgroundColor: noticeModal.isError ? "#fef2f2" : "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: noticeModal.isError ? "#dc2626" : "#059669", marginBottom: "12px" }}>
                {noticeModal.isError ? <AlertTriangle size={28} /> : <CheckCircle2 size={28} />}
              </div>
              <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "800", color: noticeModal.isError ? "#991b1b" : "#065f46" }}>{noticeModal.title}</h3>
              <p style={{ margin: "0 0 20px 0", fontSize: "13.5px", color: "#4b5563", lineHeight: "1.5" }}>{noticeModal.message}</p>
            </div>
            <button 
              type="button" 
              onClick={() => setNoticeModal(null)} 
              style={{ width: "100%", padding: "10px", backgroundColor: noticeModal.isError ? "#dc2626" : "#059669", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px" }}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* ==================== MODAL ยืนยันการลบ ==================== */}
      {deleteConfirmConfig && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmConfig(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, backdropFilter: "blur(4px)" }}>
          <div className="fg-rise" style={{ maxWidth: "420px", width: "90%", backgroundColor: "#fff", padding: "24px", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", border: "1px solid #fee2e2" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", backgroundColor: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", marginBottom: "12px" }}>
                <AlertTriangle size={28} />
              </div>
              <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "800", color: "#991b1b" }}>{deleteConfirmConfig.title}</h3>
              <p style={{ margin: "0 0 20px 0", fontSize: "13.5px", color: "#4b5563", lineHeight: "1.5" }}>{deleteConfirmConfig.message}</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                type="button" 
                onClick={() => setDeleteConfirmConfig(null)} 
                style={{ flex: 1, padding: "10px", backgroundColor: "#fff", color: "#4b5563", border: "1px solid #d1d5db", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px" }}
              >
                ยกเลิก
              </button>
              <button 
                type="button" 
                onClick={deleteConfirmConfig.onConfirm} 
                style={{ flex: 1, padding: "10px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px", boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)" }}
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL ฟอร์มพนักงาน ==================== */}
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
                  <input type="text" value={empForm.dept} onChange={e => setEmpForm({ ...empForm, dept: e.target.value })} placeholder="ฝ่ายบัญชี" className="admin-input" />
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
                <input type="text" value={empForm.id} onChange={e => setEmpForm({ ...empForm, id: e.target.value })} placeholder="EMP-1099" required className="admin-input" />
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

      {/* ==================== MODAL ฟอร์มรถยนต์ (เพิ่มช่องแก้ไขเลขไมล์) ==================== */}
      {isCarModalOpen && (
        <div className="modal-overlay">
          <div className="fg-rise admin-modal-card" style={{ maxWidth: "550px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{editingCarId ? "แก้ไขข้อมูลรถยนต์" : "เพิ่มรถคันใหม่"}</h3>
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
                <label>ID (รถยนต์)</label>
                <input type="text" value={carForm.id} onChange={e => setCarForm({ ...carForm, id: e.target.value })} placeholder="v5" disabled={!!editingCarId} required className="admin-input" />
              </div>
              <div className="admin-field">
                <label>รุ่นรถยนต์</label>
                <input type="text" value={carForm.model} onChange={e => setCarForm({ ...carForm, model: e.target.value })} placeholder="Toyota Revo" required className="admin-input" />
              </div>
              <div className="admin-field">
                <label>ป้ายทะเบียน</label>
                <input type="text" value={carForm.plate} onChange={e => setCarForm({ ...carForm, plate: e.target.value })} placeholder="3กข-4567 กทม." required className="admin-input" />
              </div>
              <div className="admin-field">
                <label>ความจุที่นั่ง</label>
                <input type="number" value={carForm.seats} onChange={e => setCarForm({ ...carForm, seats: parseInt(e.target.value) || 0 })} required className="admin-input" />
              </div>

              {/* 🟢 ช่องกรอก/แก้ไขเลขไมล์สะสมล่าสุด */}
              <div className="admin-field">
                <label style={{ display: "flex", alignItems: "center", gap: "4px", color: "#D97706", fontWeight: "700" }}>
                  <Gauge size={14} /> เลขไมล์ที่ใช้งาน (ไมล์)
                </label>
                <input 
                  type="number" 
                  value={carForm.mileage} 
                  onChange={e => setCarForm({ ...carForm, mileage: parseInt(e.target.value) || 0 })} 
                  min="0"
                  required 
                  className="admin-input" 
                />
              </div>

              <div className="admin-field">
                <label className="accent">เลขที่ พ.ร.บ.</label>
                <input type="text" value={carForm.act_number} onChange={e => setCarForm({ ...carForm, act_number: e.target.value })} placeholder="ACT-998877" className="admin-input" />
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