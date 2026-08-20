import type { ConsumerPet } from "../../_prototype/consumerPets";
import { speciesLabel } from "../../_prototype/consumerPets";
import type { SafetyPrototypeState, SafetyStatus } from "../../_prototype/safetyState";
import { formatPrototypeDate } from "../../_prototype/safetyState";
import { Eye, MapPin, Megaphone, ShieldAlert, ShieldCheck, ShieldOff } from "../../_components/icons";
import { PetPhoto } from "../../my-pets/_components/PetPhoto";

const statusContent: Record<SafetyStatus, { label: string; Icon: typeof ShieldCheck }> = {
  "not-configured": { label: "ยังไม่ได้ตั้งค่า", Icon: ShieldOff },
  active: { label: "Safety Profile เปิดอยู่", Icon: ShieldCheck },
  disabled: { label: "Safety Profile ถูกปิด", Icon: ShieldOff },
  lost: { label: "กำลังตามหา", Icon: ShieldAlert },
};

export function SafetyStatusBadge({ status }: { status: SafetyStatus }) {
  const { label, Icon } = statusContent[status];
  return <span className={`safety-status safety-status--${status}`}><Icon size={18} weight="bold" /> {label}</span>;
}

export function SafetyProfileCard({
  pet,
  state,
  perspectiveLabel = "PUBLIC VIEWER PERSPECTIVE",
}: {
  pet: ConsumerPet;
  state: SafetyPrototypeState;
  perspectiveLabel?: string;
}) {
  const isLost = state.status === "lost" && state.lostCase?.phase === "active";
  const details = state.lostCase?.details;

  return (
    <article className={`safety-profile-card${isLost ? " safety-profile-card--lost" : ""}`}>
      <header className="safety-profile-card__status">
        <p>{perspectiveLabel}</p>
        <SafetyStatusBadge status={isLost ? "lost" : "active"} />
      </header>

      <div className="safety-profile-card__identity">
        {state.publicFields.photo ? (
          <PetPhoto src={pet.photoSrc} name={pet.name} className="pet-photo--safety" />
        ) : (
          <span className="safety-profile-card__private-photo" aria-label="เจ้าของเลือกซ่อนรูปสัตว์เลี้ยง"><Eye size={32} weight="bold" /></span>
        )}
        <div>
          <p className="consumer-kicker">{isLost ? "LOST PET" : "PUBLIC SAFETY PROFILE"}</p>
          <h2>{pet.name}</h2>
          <p>{speciesLabel(pet.species)} · Permanent safety identity</p>
        </div>
      </div>

      {isLost && details ? (
        <section className="safety-public-section safety-public-section--lost" aria-labelledby="lost-public-summary">
          <Megaphone size={24} weight="bold" />
          <div>
            <h3 id="lost-public-summary">ช่วยพา {pet.name} กลับบ้านอย่างปลอดภัย</h3>
            <dl className="safety-public-facts">
              <div><dt>พบล่าสุด</dt><dd>{formatPrototypeDate(details.lastSeenAt)}</dd></div>
              <div><dt>บริเวณ</dt><dd>{details.area}</dd></div>
            </dl>
          </div>
        </section>
      ) : null}

      <div className="safety-profile-card__sections">
        {state.publicFields.features && state.features ? (
          <section className="safety-public-section"><Eye size={21} weight="bold" /><div><h3>สีและจุดสังเกต</h3><p>{state.features}</p></div></section>
        ) : null}
        {state.publicFields.approach && state.approach ? (
          <section className="safety-public-section"><ShieldCheck size={21} weight="bold" /><div><h3>วิธีเข้าใกล้อย่างปลอดภัย</h3><p>{state.approach}</p></div></section>
        ) : null}
        {state.publicFields.emergency && state.emergency ? (
          <section className="safety-public-section"><ShieldAlert size={21} weight="bold" /><div><h3>ข้อมูลฉุกเฉินที่ผู้ดูแลเลือกเปิด</h3><p>{state.emergency}</p></div></section>
        ) : null}
        {!state.publicFields.features && !state.publicFields.approach && !state.publicFields.emergency ? (
          <section className="safety-public-section safety-public-section--empty"><MapPin size={21} weight="bold" /><div><h3>ข้อมูลสาธารณะเท่าที่จำเป็น</h3><p>ผู้ดูแลยังไม่ได้เลือกเปิดรายละเอียดเพิ่มเติม</p></div></section>
        ) : null}
      </div>
    </article>
  );
}
