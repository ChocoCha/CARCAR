import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const API_BASE = `http://${window.location.hostname}:5000/api`;

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

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIsoStr = toISO(tomorrow);

      const formatted = (Array.isArray(data) ? data : [])
        .filter((b) => b.status !== 'cancelled')
        .filter((b) => {
          const rawVehicleId = b.vehicle_id ?? b.vehicleId;
          const startIsoStr = formatDateToLocal(b.start_date ?? b.startDate);
          
          if (!rawVehicleId && startIsoStr >= tomorrowIsoStr) {
            return false;
          }
          return true;
        })
        .map((b) => ({
          id: b.id,
          vehicleId: b.vehicle_id ?? b.vehicleId ?? 'deleted_car',
          vehicleModel: b.vehicle_model ?? b.vehicleModel,
          plate: b.plate,
          borrower: b.borrower,
          status: b.status,
          isDeletedVehicle: !b.vehicle_id && !b.vehicleId, // 🟢 มาร์กไว้ว่ารถโดนลบแล้ว
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
                  <span className="cal-cell-date">
                    <span>{date.getDate()}</span>
                  </span>
                  {dayBookings.map((b) => (
                    <div
                      key={b.id}
                      className={`cal-booking-bar ${b.isDeletedVehicle ? "is-deleted-bar" : ""}`}
                      style={{ 
                        background: b.isDeletedVehicle ? "#9CA3AF" : colorFor(b.vehicleId),
                        opacity: b.isDeletedVehicle ? 0.45 : 1,
                        textDecoration: b.isDeletedVehicle ? "line-through" : "none"
                      }}
                      title={`${b.plate || b.vehicleModel} · ${b.borrower} ${b.isDeletedVehicle ? "(ลบรถแล้ว)" : ""}`}
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