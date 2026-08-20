import {
  CalendarDays,
  Chart,
  Clock,
  MessageCircle,
  Scan,
  UserRoundCheck,
  UsersRound,
  Wallet,
} from "../icons";

const coreCapabilities = [
  {
    icon: CalendarDays,
    title: "การจอง",
    copy: "สร้างและแก้ไขนัดหมายหลายรูปแบบ พร้อมตรวจเวลาหรือความจุที่ชนกัน",
    status: "งานหน้าร้าน",
    statusType: "operations",
  },
  {
    icon: Clock,
    title: "ปฏิทิน",
    copy: "ดูงานกรูมมิ่ง การเข้าพัก และ Daycare ร่วมกันตามวันหรือสัปดาห์",
    status: "ตารางงาน",
    statusType: "schedule",
  },
  {
    icon: UsersRound,
    title: "ลูกค้าและสัตว์เลี้ยง",
    copy: "ออกแบบให้ข้อมูลติดต่อ ความต้องการ และประวัติบริการเชื่อมต่อกัน",
    status: "ข้อมูลลูกค้า",
    statusType: "information",
  },
  {
    icon: MessageCircle,
    title: "ข้อความ",
    copy: "ส่งสถานะ รูป และคำขออนุมัติในบริบทของงานนั้น ให้ทีมกับเจ้าของคุยกันรู้เรื่อง",
    status: "การสื่อสาร",
    statusType: "information",
  },
  {
    icon: Scan,
    title: "รับเข้า",
    copy: "สแกน QR ชั่วคราว ตรวจสิทธิ์ ดูข้อมูลที่อนุญาต และบันทึกของติดตัว",
    status: "รับเข้า",
    statusType: "intake",
  },
  {
    icon: UserRoundCheck,
    title: "ทีมและสาขา",
    copy: "จัดวางบริบทร้าน สาขา ทีม และสิทธิ์ให้ทำงานร่วมกันได้ชัดเจน",
    status: "ทีมและสาขา",
    statusType: "team",
  },
  {
    icon: Wallet,
    title: "การเงิน",
    copy: "รวมค่าบริการ สถานะชำระ และภาพรวมรายรับของแต่ละสาขา",
    status: "การเงิน",
    statusType: "information",
  },
  {
    icon: Chart,
    title: "รายงาน",
    copy: "มองแนวโน้มงาน ความจุ และผลการดำเนินงานที่นำไปใช้ได้จริง",
    status: "รายงาน",
    statusType: "information",
  },
] as const;

export function BusinessCoreSection() {
  return (
    <section id="business-core" className="business-core-section shell" aria-labelledby="business-core-title">
      <div className="business-core-section__intro business-section-intro">
        <p className="business-eyebrow">ระบบหลักของธุรกิจ</p>
        <h2 id="business-core-title">งานสำคัญของร้าน เชื่อมกันในระบบเดียว</h2>
        <p>
          Meawketting ถูกออกแบบให้ข้อมูลจากหน้าร้านไม่จบเป็นจุด ๆ
          แต่ส่งต่องานจากคนหนึ่งไปยังอีกคนได้อย่างเข้าใจตรงกัน
        </p>
        <aside>
          <strong>ภาพรวมสำหรับร้าน</strong>
          <p>รวมงานประจำวันของร้านไว้ในจังหวะเดียว ตั้งแต่การรับจอง การเตรียมงาน ไปจนถึงการส่งมอบบริการ</p>
        </aside>
      </div>

      <div className="business-core-list">
        {coreCapabilities.map(({ icon: Icon, title, copy, status, statusType }) => (
          <article key={title} className="business-core-list__item">
            <span className="business-core-list__icon"><Icon size={22} /></span>
            <div><h3>{title}</h3><p>{copy}</p></div>
            <small className={`is-${statusType}`}>{status}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
