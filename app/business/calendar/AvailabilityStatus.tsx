import type { BookingAvailabilityResult, BookingConflictRecovery } from "../../_prototype/businessState";
import { CheckCircle, CircleAlert } from "../../_components/icons";

const recoveryLabels: Record<BookingConflictRecovery, string> = {
  "change-time": "เปลี่ยนเวลา",
  "change-resource": "เปลี่ยนตัวเลือก",
  "change-date": "เปลี่ยนวันที่",
  "return-to-edit": "กลับไปแก้การจอง",
};

export function AvailabilityStatus({
  result,
  id,
  show,
  automatic = false,
  onRecovery,
}: {
  result: BookingAvailabilityResult;
  id: string;
  show: boolean;
  automatic?: boolean;
  onRecovery: (recovery: BookingConflictRecovery) => void;
}) {
  if (!show) {
    return <div className="sr-only" id={id}>ระบบจะตรวจเวลาว่างก่อนทบทวน</div>;
  }

  if (result.available) {
    return (
      <div className="availability-status availability-status--ready" id={id} role="status" aria-live="polite" tabIndex={-1}>
        <CheckCircle size={19} />
        <div><small>{automatic ? "ตรวจสอบอัตโนมัติ" : "ผลการตรวจสอบ"}</small><strong>เวลานี้ว่าง</strong></div>
      </div>
    );
  }

  const recoveries = [...new Set(result.conflicts.map((conflict) => conflict.recovery))];
  return (
    <section className="availability-status availability-status--conflict" id={id} role="alert" aria-live="assertive" tabIndex={-1}>
      <CircleAlert size={20} />
      <div>
        {automatic ? <small>ตรวจสอบอัตโนมัติ</small> : null}
        <strong>ยังยืนยันการจองไม่ได้</strong>
        <ul>
          {result.conflicts.map((conflict, index) => <li key={`${conflict.code}-${index}`}>{conflict.message}</li>)}
        </ul>
        <div className="availability-status__actions">
          {recoveries.map((recovery) => (
            <button key={recovery} type="button" onClick={() => onRecovery(recovery)}>{recoveryLabels[recovery]}</button>
          ))}
        </div>
      </div>
    </section>
  );
}
