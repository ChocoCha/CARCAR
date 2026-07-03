// pages/TrafficCalendar.jsx
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import "../styles/calendar.css";

const API_BASE = "http://localhost:5000/api";
const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

// อยู่ในโทนเหลือง-เทาเดียวกับธีมหลักทั้งหมด แยกรถแต่ละคันด้วยความเข้ม-อ่อนแทนสีฉูดฉาด
// 🟢 ปรับด้านบนของไฟล์ TrafficCalendar.jsx ให้เหลือแบบนี้ชุดเดียวเป๊ะๆ ครับ

const VEHICLE_COLORS = {
  v1: "#F59E0B", // สีเหลืองส้มสดใส
  v2: "#10B981", // สีเขียวมรกต
  v3: "#3B82F6", // สีน้ำเงินสว่าง
  v4: "#EC4899", // สีชมพูมาเจนต้า
  v5: "#6B7280", // สีเทาเข้ม
  v6: "#8B5CF6"  // สีม่วง
};

function colorFor(key) {
  const normalizedKey = String(key).toLowerCase().trim();
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
  return `${y}-${m}-${d}`;
}

function formatDateToLocal(dateStr) {
  if (!dateStr) return "";
  return toISO(new Date(dateStr));
}



export default function TrafficCalendar({ currentUser, onNavigate }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings`);
      if (!res.ok) throw new Error("ดึงข้อมูลคิวจองไม่สำเร็จ");
      const data = await res.json();
      const formatted = (Array.isArray(data) ? data : []).map((b) => ({
        id: b.id,
        vehicleId: b.vehicle_id ?? b.vehicleId,
        vehicleModel: b.vehicle_model ?? b.vehicleModel,
        plate: b.plate,
        borrower: b.borrower,
        startDate: formatDateToLocal(b.start_date ?? b.startDate),
        endDate: formatDateToLocal(b.end_date ?? b.endDate),
      }));
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
    const iso = toISO(date);
    return bookings.filter(
      (b) => b.startDate && b.endDate && b.startDate <= iso && b.endDate >= iso
    );
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
      subtitle="ตรวจสอบผังคิวจองรถของพนักงานทุกคนรายเดือน"
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

        {/* คำอธิบายสี — อยู่ด้านบน เหนือปฏิทิน */}
        {uniqueVehicles.length > 0 && (
          <div className="cal-legend">
            {uniqueVehicles.map((v) => (
              <span key={v.vehicleId} className="cal-legend-item">
                <span className="cal-legend-dot" style={{ background: colorFor(v.vehicleId) }} />
                {v.plate || v.vehicleModel}
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
              const isToday = toISO(date) === toISO(new Date());
              return (
                <div
                  key={date.toISOString()}
                  className={`cal-cell ${inMonth ? "" : "is-outside"} ${isToday ? "is-today" : ""}`}
                >
                  <span className="cal-cell-date">{date.getDate()}</span>
                  {dayBookings.map((b) => (
                    <div
                        key={b.id}
                        className="cal-booking-bar"
                        style={{ background: colorFor(b.vehicleId) }}
                        title={`${b.plate || b.vehicleModel} · ${b.borrower}`}
                    >
                        {b.plate || b.vehicleModel}
                    </div>
                    ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}