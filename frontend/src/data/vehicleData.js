// data/vehicleData.js
// ข้อมูลตัวอย่างรถของบริษัท — เชื่อมกับ services/api.js ในภายหลังเพื่อดึงข้อมูลจริงจาก backend

const vehicleData = [
  {
    id: "v1",
    plate: "กข 1234",
    type: "รถกระบะ",
    model: "CAB 4 ประตู",
    seats: 4,
    image: "/images/pick up.jpg",
    status: "available", // available | busy | maintenance
  },
  {
    id: "v2",
    plate: "บค 6",
    type: "รถบัส",
    model: "รถบัสโดยสาร",
    seats: 50,
    image: "/images/bus.jpg",
    status: "available",
  },
  {
    id: "v3",
    plate: "บจ 888",
    type: "รถตู้",
    model: "รถตู้โดยสาร",
    seats: 13,
    image: "/images/van.jpg",
    status: "busy",
  },
];

export default vehicleData;
