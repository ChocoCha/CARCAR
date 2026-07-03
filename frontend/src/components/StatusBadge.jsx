// components/StatusBadge.jsx
// ป้ายสถานะรถ ใช้ซ้ำได้ทั้งในการ์ดรถและตารางอื่น ๆ

const STATUS_MAP = {
  available: { label: "พร้อมใช้งาน", className: "is-available" },
  busy: { label: "ไม่ว่าง", className: "is-busy" },
  maintenance: { label: "ซ่อมบำรุง", className: "is-maintenance" },
};

export default function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || STATUS_MAP.available;
  return <span className={`status-badge ${info.className}`}>{info.label}</span>;
}
