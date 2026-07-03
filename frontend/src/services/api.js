// services/api.js
// จุดเชื่อมต่อ backend (เช่น PHP/XAMPP ตามที่เห็นในภาพ, หรือ Node/Express)
// ตอนนี้ยังเป็น mock — ให้แก้ BASE_URL แล้วเปลี่ยนไปเรียกจริงภายหลัง

const BASE_URL = "http://127.0.0.1/thecar"; // แก้ตาม backend จริงของบริษัท

export async function getVehicles() {
  // ตัวอย่างเมื่อพร้อมต่อ backend จริง:
  // const res = await fetch(`${BASE_URL}/api/vehicles`);
  // if (!res.ok) throw new Error("โหลดข้อมูลรถไม่สำเร็จ");
  // return res.json();

  const vehicleData = (await import("../data/vehicleData")).default;
  return vehicleData;
}

export async function bookVehicle(vehicleId, payload) {
  // const res = await fetch(`${BASE_URL}/api/bookings`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ vehicleId, ...payload }),
  // });
  // return res.json();
  console.log("mock booking:", vehicleId, payload);
  return { ok: true };
}
