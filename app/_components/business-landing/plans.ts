export const businessPlans = [
  {
    name: "Paw Start",
    price: 0,
    branches: 1,
    description: "เริ่มรับลูกค้าและเก็บข้อมูลร้าน",
    icon: "start",
    features: ["ข้อมูลลูกค้าและสัตว์เลี้ยง", "นัดหมายและการจอง", "ดู Pet Passport ที่เจ้าของแชร์"],
    action: "เริ่มต้นใช้งานฟรี",
  },
  {
    name: "Paw Care",
    price: 490,
    branches: 3,
    description: "จัดการงานร้าน พร้อมทีมและหลายสาขา",
    icon: "care",
    features: ["สแกน QR เพื่อเช็กอิน", "โรงแรม อาบน้ำตัดขน และเดย์แคร์", "ตารางทีมและข้อความลูกค้า", "บันทึกค่าบริการและรับเงิน"],
    action: "เริ่มต้นกับ Paw Care",
  },
  {
    name: "Paw Grow",
    price: 1490,
    branches: 10,
    description: "เพิ่มรายงานและดูแลลูกค้าให้ครบ",
    icon: "grow",
    features: ["ทุกอย่างใน Paw Care", "รายงานธุรกิจ", "จัดกลุ่มลูกค้า", "ตั้งค่าสาขาและบริการของร้าน"],
    action: "เริ่มต้นกับ Paw Grow",
  },
] as const;

export const planComparisons = [
  { feature: "จำนวนสาขา", values: businessPlans.map((plan) => `${plan.branches} สาขา`) },
  { feature: "ลูกค้าที่รับได้ต่อวัน", values: ["3 คน / วัน", "ไม่จำกัด", "ไม่จำกัด"] },
  { feature: "ข้อมูลลูกค้าและสัตว์เลี้ยง", values: [true, true, true] },
  { feature: "นัดหมายและการจอง", values: [true, true, true] },
  { feature: "ดู Pet Passport ที่เจ้าของแชร์", values: [true, true, true] },
  { feature: "สแกน QR เพื่อเช็กอิน", values: [false, true, true] },
  { feature: "โรงแรม อาบน้ำตัดขน และเดย์แคร์", values: [false, true, true] },
  { feature: "ตารางงานทีม", values: [false, true, true] },
  { feature: "ข้อความลูกค้า", values: [false, true, true] },
  { feature: "บันทึกค่าบริการและรับเงิน", values: [false, true, true] },
  { feature: "รายงานธุรกิจ", values: [false, false, true] },
  { feature: "จัดกลุ่มลูกค้า", values: [false, false, true] },
] as const;
