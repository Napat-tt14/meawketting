import Image from "next/image";
import { CalendarDays, CheckCircle, MessageCircle, Scan, Scissors, Storefront } from "../icons";

const workflow = [
  { icon: CalendarDays, title: "ลูกค้าจอง" },
  { icon: Storefront, title: "ร้านเตรียมงาน" },
  { icon: Scan, title: "รับน้องเข้าร้าน" },
  { icon: Scissors, title: "ให้บริการ" },
  { icon: MessageCircle, title: "แจ้งเจ้าของ" },
  { icon: CheckCircle, title: "ส่งมอบ / CareProof" },
] as const;

export function BusinessWorkflowSection() {
  return (
    <section id="workflow" className="business-workflow-section" aria-labelledby="business-workflow-title">
      <div className="shell">
        <div className="business-section-intro business-workflow-section__intro">
          <p className="business-eyebrow">งานของร้าน เดินต่อกัน</p>
          <h2 id="business-workflow-title">ตั้งแต่นัดหมาย จนถึงส่งมอบบริการ</h2>
          <p>
            ออกแบบให้ทีมเห็นจังหวะสำคัญของงานเดียวกัน ตั้งแต่ลูกค้าจอง
            จนถึงแจ้งเจ้าของและส่งต่อประวัติบริการ
          </p>
        </div>

        <div className="business-workflow-section__stage">
          <div className="business-workflow-section__photo">
            <Image
              src="/images/business/pet-business-workflow-photo.png"
              alt="ภาพถ่ายขณะทีมกำลังดูแลแมวสามสีในขั้นตอนให้บริการ"
              fill
              sizes="(max-width: 767px) 100vw, 36vw"
            />
            <div className="business-workflow-section__photo-note">
              <span>งานต่อเนื่อง</span>
              <strong>Mochi</strong>
              <small>พักโรงแรม 3 คืน · อาบน้ำก่อนรับกลับ</small>
            </div>
          </div>

          <div className="business-workflow-section__track">
            <div className="business-workflow-section__track-head">
              <span>หนึ่งงาน มองเห็นต่อกัน</span>
              <strong>ทีมรู้ว่าต้องทำอะไรต่อ</strong>
            </div>

            <ol className="business-workflow-section__steps">
              {workflow.map(({ icon: Icon, title }, index) => (
                <li key={title}>
                  <span><Icon size={22} /></span>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  <strong>{title}</strong>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

