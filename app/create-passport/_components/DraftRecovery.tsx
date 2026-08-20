import { ArrowRight, CircleAlert, House } from "../../_components/icons";

type DraftRecoveryProps = {
  title: string;
  message: string;
  preservation?: string;
  recoveryHref?: string;
  recoveryLabel?: string;
};

export function DraftRecovery({
  title,
  message,
  preservation = "ยังไม่มีข้อมูลถูกส่งหรือบันทึกไปยังระบบจริง",
  recoveryHref = "/create-passport",
  recoveryLabel = "เริ่มจากการเลือกรูป",
}: DraftRecoveryProps) {
  return (
    <section className="flow-recovery" role="alert" aria-labelledby="draft-recovery-title">
      <span className="flow-recovery__icon"><CircleAlert size={32} weight="bold" /></span>
      <div>
        <p className="flow-recovery__eyebrow">Draft ต้องการการตรวจสอบ</p>
        <h2 id="draft-recovery-title">{title}</h2>
        <p>{message}</p>
        <p className="flow-recovery__preservation">{preservation}</p>
      </div>
      <div className="flow-recovery__actions">
        <a className="button button--primary button--large" href={recoveryHref}>
          {recoveryLabel} <ArrowRight size={18} weight="bold" />
        </a>
        <a className="button button--ghost" href="/">
          <House size={18} weight="bold" /> กลับหน้าแรก
        </a>
      </div>
    </section>
  );
}

