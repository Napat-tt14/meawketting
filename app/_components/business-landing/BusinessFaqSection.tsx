import { ChevronDown } from "../icons";

const questions = [
  { question: "Meawketting เหมาะกับร้านสัตว์เลี้ยงแบบไหน?", answer: "Meawketting เป็นระบบจัดการโรงแรมสัตว์เลี้ยง ร้านอาบน้ำตัดขน และเดย์แคร์ ช่วยเชื่อมการจอง งานดูแล ข้อมูลลูกค้าและสัตว์เลี้ยงไว้ในที่เดียว ให้ทีมติดตามงานได้ต่อเนื่องตั้งแต่รับจองจนส่งน้องกลับบ้าน" },
  { question: "เริ่มใช้งานฟรีได้ไหม และแพ็กเกจราคาเท่าไร?", answer: "เริ่มต้นด้วย Paw Start ฟรี รับลูกค้าได้วันละ 3 คน พร้อมข้อมูลลูกค้า สัตว์เลี้ยง และการจองพื้นฐาน โดยใช้ QR Check-in ไม่ได้ หากต้องการรับลูกค้าไม่จำกัดและสแกน QR เพื่อ Check-in เลือก Paw Care ราคา 490 บาทต่อเดือน หรือ Paw Grow ราคา 1,490 บาทต่อเดือนสำหรับหลายสาขา รายงาน และ CRM" },
  { question: "แพ็กเกจรายปีฟรี 2 เดือน คิดราคาอย่างไร?", answer: "รายปีชำระเทียบเท่า 10 เดือนและใช้งานได้ครบ 12 เดือน โดย Paw Care ราคา 4,900 บาทต่อปี ประหยัด 980 บาท และ Paw Grow ราคา 14,900 บาทต่อปี ประหยัด 2,980 บาท เมื่อเทียบกับการชำระรายเดือนครบปี" },
  { question: "แต่ละแพ็กเกจรองรับได้กี่สาขา?", answer: "Paw Start รองรับ 1 สาขา, Paw Care รองรับสูงสุด 3 สาขา และ Paw Grow รองรับสูงสุด 10 สาขา โดยจำนวนสาขาเท่ากันทั้งรอบชำระรายเดือนและรายปี เลือกแพ็กเกจให้เหมาะกับขนาดธุรกิจและจำนวนสาขาที่ต้องดูแล" },
  { question: "Pet Passport ช่วยให้ร้านดูแลสัตว์เลี้ยงได้อย่างไร?", answer: "Pet Passport เชื่อมข้อมูลของสัตว์เลี้ยงเฉพาะส่วนที่เจ้าของอนุญาตให้ร้านเข้าถึง พร้อมประวัติบริการของร้าน ช่วยให้ทีมมีข้อมูลที่จำเป็นต่อการดูแล โดยเจ้าของยังเลือกขอบเขตข้อมูลที่แชร์ได้" },
] as const;

export function BusinessFaqSection() {
  return (
    <section className="business-faq shell" aria-labelledby="business-faq-title">
      <div className="visual-heading"><p className="business-eyebrow">GOOD QUESTIONS, GENTLE ANSWERS</p><h2 id="business-faq-title">เรื่องที่อยากรู้ก่อนเริ่มดูแลร้าน</h2><p>คำถามที่พบบ่อยเกี่ยวกับระบบจัดการร้านสัตว์เลี้ยง Meawketting</p></div>
      <div className="business-faq__list">{questions.map(({question, answer}) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div>
    </section>
  );
}
