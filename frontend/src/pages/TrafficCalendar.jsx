import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, User, MapPin, Calendar, Clock, Tag, Briefcase, AlertTriangle } from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import "../styles/calendar.css";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const VEHICLE_COLORS = {
  v1: "#F59E0B",
  v2: "#10B981",
  v3: "#3B82F6",
  v4: "#EC4899",
  v5: "#6B7280",
  v6: "#8B5CF6"
};

function colorFor(key) {
  const normalizedKey = String(key || "").toLowerCase().trim();
  if (VEHICLE_COLORS[normalizedKey]) {
    return VEHICLE_COLORS[normalizedKey];
  }
  const fallbackColors = ["#EF4444", "#6366F1", "#14B8A6", "#F43F5E", "#84CC16"];
  const charSum = normalizedKey.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return fallbackColors[Math.abs(charSum) % fallbackColors.length];
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${mm}-${d}`;
}

function formatDateToLocal(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const thaiMonthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${d.getDate()} ${thaiMonthsShort[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export default function TrafficCalendar({ currentUser, onNavigate }) {
  const API_BASE = `http://${window.location.hostname}:5000/api`;

  const [bookings, setBookings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const todayIso = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  useEffect(() => {
    fetchEmployees();
    fetchBookings();
  }, []);

  async function fetchEmployees() {
    try {
      const res = await fetch(`${API_BASE}/employees`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error("ดึงข้อมูลพนักงานไม่สำเร็จ:", err);
    }
  }

  async function fetchBookings() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings`);
      if (!res.ok) throw new Error("ดึงข้อมูลคิวจองไม่สำเร็จ");
      const data = await res.json();

      const formatted = (Array.isArray(data) ? data : [])
        .filter((b) => b.status === 'active' && !!b.vehicle_id)
        .map((b) => {
          const sDate = formatDateToLocal(b.start_date ?? b.startDate);
          const eDate = formatDateToLocal(b.end_date ?? b.endDate);
          const isOverdue = eDate < todayIso;

          return {
            id: b.id,
            vehicleId: b.vehicle_id,
            vehicleModel: b.vehicle_model,
            plate: b.plate,
            borrower: b.borrower,
            borrowerRealName: b.borrower_real_name,
            destination: b.destination,
            status: b.status,
            startDate: sDate,
            endDate: eDate,
            isOverdue: isOverdue
          };
        });

      setBookings(formatted);
    } catch (err) {
      console.error("โหลดข้อมูลปฏิทินไม่สำเร็จ:", err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  const monthLabel = `${THAI_MONTHS[cursor.getMonth()]} ${cursor.getFullYear() + 543}`;

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  function bookingsForDay(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const iso = `${y}-${m}-${d}`;
    const isToday = iso === todayIso;

    return bookings.filter((b) => {
      if (!b.startDate || !b.endDate) return false;
      const isInActualRange = b.startDate <= iso && b.endDate >= iso;
      const isOverdueShowingToday = b.isOverdue && isToday;
      return isInActualRange || isOverdueShowingToday;
    });
  }

  function goPrevMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }
  function goNextMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }
  function goToday() {
    const d = new Date();
    d.setDate(1);
    setCursor(d);
  }

  function handleBarClick(booking, e) {
    e.stopPropagation();
    const matchEmp = employees.find(
      (emp) => emp.id?.toString().trim().toLowerCase() === booking.borrower?.toString().trim().toLowerCase()
    );

    setSelectedBooking({
      ...booking,
      displayName: booking.borrowerRealName || (matchEmp ? matchEmp.name : booking.borrower),
      department: matchEmp ? matchEmp.dept : "ไม่ระบุแผนก"
    });
  }

  const uniqueVehicles = useMemo(() => {
    const map = new Map();
    bookings.forEach((b) => {
      if (!map.has(b.vehicleId)) map.set(b.vehicleId, b);
    });
    return Array.from(map.values());
  }, [bookings]);

  return (
    <MainLayout
      activePage="traffic"
      onNavigate={onNavigate}
      title="📅 ปฏิทินการจอง"
      subtitle="ตรวจสอบผังคิวจองรถที่กำลังใช้งานของพนักงานทุกคนรายเดือน"
      userName={currentUser?.name}
      onViewHistory={() => onNavigate?.("bookings")}
    >
      <div className="cal-card">
        <div className="cal-toolbar">
          <div className="cal-nav">
            <button onClick={goPrevMonth} className="cal-nav-btn" aria-label="เดือนก่อนหน้า">
              <ChevronLeft size={16} />
            </button>
            <span className="cal-month-label">{monthLabel}</span>
            <button onClick={goNextMonth} className="cal-nav-btn" aria-label="เดือนถัดไป">
              <ChevronRight size={16} />
            </button>
          </div>
          <button onClick={goToday} className="cal-today-btn">
            วันนี้
          </button>
        </div>

        {/* 🟢 ส่วนแสดงสัญลักษณ์แถบสี (Legend): เปลี่ยนเป็นแสดงชื่อรุ่นรถ */}
        {uniqueVehicles.length > 0 && (
          <div className="cal-legend">
            {uniqueVehicles.map((v) => (
              <span key={v.vehicleId} className="cal-legend-item">
                <span className="cal-legend-dot" style={{ background: colorFor(v.vehicleId) }} />
                {/* ดึงชื่อรุ่นรถมาแสดงก่อน หากไม่มีค่อยใช้ทะเบียน */}
                {v.vehicleModel || v.plate}
              </span>
            ))}
          </div>
        )}

        <div className="cal-weekdays">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-weekday">
              {w}
            </div>
          ))}
        </div>

        {loading ? (
          <p className="cal-status">กำลังโหลดข้อมูล...</p>
        ) : (
          <div className="cal-grid">
            {days.map((date) => {
              const inMonth = date.getMonth() === cursor.getMonth();
              const dayBookings = bookingsForDay(date);
              
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, "0");
              const d = String(date.getDate()).padStart(2, "0");
              const dateIso = `${y}-${m}-${d}`;
              const isToday = dateIso === todayIso;

              return (
                <div
                  key={date.toISOString()}
                  className={`cal-cell ${inMonth ? "" : "is-outside"} ${isToday ? "is-today" : ""}`}
                >
                  <span className="cal-cell-date">
                    <span>{date.getDate()}</span>
                  </span>
                  {dayBookings.map((b) => {
                    const isOverdueNotice = b.isOverdue && dateIso === todayIso;

                    return (
                      <div
                        key={b.id}
                        onClick={(e) => handleBarClick(b, e)}
                        className="cal-booking-bar"
                        style={{ 
                          background: isOverdueNotice ? "#EF4444" : colorFor(b.vehicleId),
                          border: isOverdueNotice ? "1px solid #B91C1C" : "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between"
                        }}
                        title={isOverdueNotice ? "⚠️ เลยกำหนดการส่งคืนรถ" : "คลิกเพื่อดูรายละเอียดการจอง"}
                      >
                        {/* 🟢 ในตารางปฏิทิน: ยังคงแสดงเป็นทะเบียนรถตามเดิม */}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {b.plate || b.vehicleModel}
                        </span>
                        {isOverdueNotice && (
                          <span style={{ fontSize: "9px", background: "rgba(0,0,0,0.3)", padding: "1px 4px", borderRadius: "3px", marginLeft: "4px" }}>
                            ค้างส่งคืน
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* POPUP MODAL แสดงรายละเอียดเมื่อกดแถบคิวจอง */}
      {selectedBooking && (
        <div 
          className="modal-overlay" 
          onClick={() => setSelectedBooking(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
            backdropFilter: "blur(3px)"
          }}
        >
          <div 
            className="fg-rise" 
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "420px",
              width: "90%",
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "16px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #f3f4f6", paddingBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
                <Tag size={18} style={{ color: colorFor(selectedBooking.vehicleId) }} /> 
                {selectedBooking.vehicleModel}
              </h3>
              <button 
                type="button" 
                onClick={() => setSelectedBooking(null)} 
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}
              >
                <X size={20} />
              </button>
            </div>

            {selectedBooking.isOverdue && (
              <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", padding: "10px 12px", borderRadius: "8px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px", color: "#991B1B", fontSize: "13px" }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span><strong>เกินกำหนดส่งคืน!</strong> ปัจจุบันยังไม่มีการกดคืนรถในระบบ คิวจะแสดงค้างไว้จนกว่าผู้ใช้จะส่งคืน</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "#374151" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#F9FAFB", padding: "10px 12px", borderRadius: "8px" }}>
                <User size={16} style={{ color: "#D97706" }} />
                <span>ผู้จอง: <strong style={{ color: "#111827" }}>{selectedBooking.displayName}</strong> ({selectedBooking.borrower})</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#F9FAFB", padding: "10px 12px", borderRadius: "8px" }}>
                <Briefcase size={16} style={{ color: "#2563EB" }} />
                <span>แผนก: <strong style={{ color: "#111827" }}>{selectedBooking.department}</strong></span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#F9FAFB", padding: "10px 12px", borderRadius: "8px" }}>
                <MapPin size={16} style={{ color: "#DC2626" }} />
                <span>งานโครงการ: <strong style={{ color: "#B91C1C" }}>{selectedBooking.destination || "ไม่ระบุงานโครงการ"}</strong></span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#F9FAFB", padding: "10px 12px", borderRadius: "8px" }}>
                <Calendar size={16} style={{ color: "#059669" }} />
                <span>
                  กำหนดการจอง: <strong style={{ color: "#111827" }}>{formatDateDisplay(selectedBooking.startDate)} - {formatDateDisplay(selectedBooking.endDate)}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedBooking(null)}
              style={{
                width: "100%",
                marginTop: "20px",
                padding: "10px",
                backgroundColor: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </MainLayout>
  );
}