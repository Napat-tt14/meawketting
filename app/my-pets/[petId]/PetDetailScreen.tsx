"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConsumerPet } from "../../_prototype/consumerPets";
import {
  getPrototypeFixturePets,
  getPrototypePetBySlug,
  guardianRoleLabel,
  parsePrototypeFixture,
  speciesLabel,
} from "../../_prototype/consumerPets";
import type { TemporaryAccess } from "../../_prototype/sharingState";
import { listTemporaryAccessForPet } from "../../_prototype/sharingState";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpenText,
  CircleAlert,
  CircleDashed,
  Clock,
  Eye,
  FirstAidKit,
  PawPrint,
  ShieldAlert,
  ShieldCheck,
  Storefront,
} from "../../_components/icons";
import { PetActionRow } from "../_components/PetActionRow";
import { PetSafetyQuickPanel } from "../_components/PetSafetyQuickPanel";
import { PetStatus } from "../_components/PetStatus";
import { QuickPassportCard } from "../_components/QuickPassportCard";

type DetailState = "loading" | "ready" | "error" | "permission-denied" | "not-found";

export function PetDetailScreen({ petId }: { petId: string }) {
  const [state, setState] = useState<DetailState>("loading");
  const [pet, setPet] = useState<ConsumerPet | null>(null);
  const [temporaryAccesses, setTemporaryAccesses] = useState<TemporaryAccess[]>([]);
  const [fixtureName, setFixtureName] = useState<string | null>(null);
  const [safetyOpen, setSafetyOpen] = useState(false);

  const load = useCallback(() => {
    const requestedFixture = new URLSearchParams(window.location.search).get("fixture");
    setFixtureName(requestedFixture);
    setSafetyOpen(window.location.hash === "#safety-settings");
    if (requestedFixture === "error") {
      setState("error");
      return;
    }
    if (requestedFixture === "denied") {
      setPet(null);
      setState("permission-denied");
      return;
    }

    const fixture = parsePrototypeFixture(requestedFixture);
    const fixturePets = getPrototypeFixturePets(fixture);
    const directPet = fixture ? null : getPrototypePetBySlug(petId);
    const availablePets = fixturePets ?? (directPet ? [directPet] : []);
    const match = availablePets.find((candidate) => candidate.prototypeSlug === petId) ?? null;
    setPet(match);
    setTemporaryAccesses(match ? listTemporaryAccessForPet(match.prototypeSlug) : []);
    setState(match ? "ready" : "not-found");
  }, [petId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(load);
    const onSharingState = () => load();
    window.addEventListener("meawketting:sharing-state", onSharingState);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("meawketting:sharing-state", onSharingState);
    };
  }, [load]);

  const retryFromError = useCallback(() => {
    window.history.replaceState({}, "", window.location.pathname);
    load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className="consumer-page consumer-page--detail shell" aria-busy="true">
        <a className="consumer-back" href="/my-pets"><ArrowLeft size={18} weight="bold" /> My Pets</a>
        <section className="pet-detail-skeleton" aria-label="กำลังโหลดรายละเอียดสัตว์เลี้ยง">
          <span className="pet-detail-skeleton__photo" />
          <div><p className="consumer-kicker">Pet Detail</p><h1>กำลังเปิดข้อมูลสัตว์เลี้ยง</h1></div>
        </section>
      </div>
    );
  }

  if (state === "permission-denied") {
    return <DetailRecovery title="ยังเปิดข้อมูลนี้ไม่ได้" message="ไม่พบความสัมพันธ์ผู้ดูแลที่อนุญาตในต้นแบบ จึงไม่แสดงชื่อ รูป หรือข้อมูลระบุตัวสัตว์เลี้ยง" />;
  }
  if (state === "error") {
    return <DetailRecovery title="โหลดรายละเอียดไม่สำเร็จ" message="ข้อมูลต้นแบบในแท็บนี้ยังไม่ถูกลบ ลองอ่านข้อมูลอีกครั้ง หรือกลับไปเลือกรายการจาก My Pets" retry={retryFromError} />;
  }
  if (state === "not-found" || !pet) {
    const isClaimedLocal = petId === "claimed-local";
    return (
      <DetailRecovery
        title="ไม่พบสัตว์เลี้ยงรายการนี้"
        message={isClaimedLocal
          ? "ยังไม่พบ Passport นี้ ลองกลับไปสร้าง Passport ใหม่แล้วเปิดอีกครั้ง"
          : "ลิงก์อาจไม่ตรงกับข้อมูลต้นแบบในแท็บนี้ เราไม่ได้แสดงข้อมูลของสัตว์เลี้ยงตัวอื่นแทน"}
        showCreate={isClaimedLocal}
        showDemo={isClaimedLocal}
      />
    );
  }

  const returnQuery = fixtureName ? `?fixture=${encodeURIComponent(fixtureName)}` : "";
  const isRestrained = pet.lifecycle === "memorial" || pet.lifecycle === "archived" || pet.lifecycle === "transferred";
  const isClaimedLocal = pet.prototypeSlug === "claimed-local";
  const canShareWithBusiness = !isClaimedLocal && pet.lifecycle === "active" && pet.guardianRole === "primary";
  const activeTemporaryAccesses = temporaryAccesses.filter((item) => item.status === "active" || item.status === "ready" || item.status === "awaiting-owner");

  return (
    <div className={`consumer-page consumer-page--detail shell pet-detail-theme--${pet.lifecycle}`}>
      <a className="consumer-back" href={`/my-pets${returnQuery}`}><ArrowLeft size={18} weight="bold" /> กลับ My Pets</a>
      {fixtureName ? <p className="qa-fixture-label"><CircleAlert size={17} weight="bold" /> QA fixture: {fixtureName} — ไม่ใช่ข้อมูลจากผู้ใช้จริง</p> : null}
      <h1 className="sr-only">Passport และข้อมูลของ {pet.name}</h1>

      <QuickPassportCard pet={pet} />

      {pet.lifecycle === "lost" ? (
        <section className="pet-context-banner pet-context-banner--lost" aria-labelledby="lost-detail-heading">
          <ShieldAlert size={28} weight="bold" />
          <div><h2 id="lost-detail-heading">กำลังตามหา {pet.name}</h2><p>Public Safety URL เดิมกำลังแสดง Lost experience และ Finder สามารถส่งเบาะแสใน prototype ได้</p></div>
        </section>
      ) : null}
      {pet.lifecycle === "memorial" ? (
        <section className="pet-context-banner pet-context-banner--memorial" aria-labelledby="memorial-detail-heading">
          <PawPrint size={26} weight="bold" />
          <div><h2 id="memorial-detail-heading">พื้นที่แห่งความทรงจำของ {pet.name}</h2><p>ข้อมูลนี้คงไว้ด้วยโทนที่อ่อนโยนและเป็นส่วนตัว ไม่ใช่สถานะลบหรือเก็บถาวร</p></div>
        </section>
      ) : null}
      {pet.lifecycle === "archived" || pet.lifecycle === "transferred" ? (
        <section className="pet-context-banner pet-context-banner--inactive" aria-labelledby="inactive-detail-heading">
          <CircleAlert size={25} weight="bold" />
          <div><h2 id="inactive-detail-heading">ข้อมูลนี้อยู่ในโหมดอ่านอย่างเดียว</h2><p>{pet.lifecycle === "transferred" ? "ความสัมพันธ์การดูแลถูกโอนใน fixture นี้" : "รายการถูกเก็บถาวรใน fixture นี้"} และไม่มี lifecycle action ให้ทำจากหน้านี้</p></div>
        </section>
      ) : null}

      <div className="pet-detail-sections">
        <section className="pet-detail-category" aria-labelledby="profile-summary-heading">
          <div className="pet-detail-category__heading">
            <span><BadgeCheck size={22} weight="bold" /></span>
            <div><p className="consumer-kicker">Profile</p><h2 id="profile-summary-heading">ข้อมูลน้อง</h2></div>
            <PetStatus lifecycle={pet.lifecycle} />
          </div>
          <dl className="pet-facts pet-facts--compact">
            <div><dt>ชื่อ</dt><dd>{pet.name}</dd></div>
            <div><dt>ชนิดสัตว์</dt><dd>{speciesLabel(pet.species)}</dd></div>
            <div><dt>บทบาทของคุณ</dt><dd>{guardianRoleLabel(pet.guardianRole)}</dd></div>
          </dl>
        </section>

        <section className="pet-detail-category" aria-labelledby="care-summary-heading">
          <div className="pet-detail-category__heading">
            <span><FirstAidKit size={22} weight="bold" /></span>
            <div><p className="consumer-kicker">Care</p><h2 id="care-summary-heading">สุขภาพและการดูแล</h2></div>
          </div>
          <div className="neutral-empty-summary"><CircleDashed size={24} weight="bold" /><div><strong>ยังไม่ได้เพิ่มข้อมูลสุขภาพและการดูแล</strong><p>วัคซีน การดูแล และข้อมูลสุขภาพจะอยู่ในหมวดนี้เมื่อมีข้อมูลจริง</p></div></div>
        </section>

        <section className="pet-detail-category" aria-labelledby="history-summary-heading">
          <div className="pet-detail-category__heading">
            <span><Clock size={22} weight="bold" /></span>
            <div><p className="consumer-kicker">History</p><h2 id="history-summary-heading">ประวัติ</h2></div>
          </div>
          <div className="neutral-empty-summary"><BookOpenText size={24} weight="bold" /><div><strong>ยังไม่มีประวัติบริการ</strong><p>หน้านี้ไม่สร้างข้อมูลบริการหรือข้อมูลสุขภาพจำลองขึ้นมาแทน</p></div></div>
        </section>

        {!isRestrained ? (
          <section className="pet-management-section" aria-labelledby="pet-management-heading">
            <div className="pet-detail-category__heading">
              <span><ShieldCheck size={22} weight="bold" /></span>
              <div><p className="consumer-kicker">Management & Safety</p><h2 id="pet-management-heading">จัดการและความปลอดภัย</h2></div>
            </div>
            <div className="pet-action-list">
              <PetActionRow
                icon={ShieldAlert}
                title="Lost Mode"
                status={pet.lifecycle === "lost" ? "กำลังเปิดอยู่" : "พร้อมตั้งค่า"}
                description="เริ่มตามหา ดูเบาะแส หรือยืนยันเมื่อพบน้องแล้ว"
                href={`/my-pets/${pet.prototypeSlug}/safety/lost`}
                prominent
              />
              {isClaimedLocal ? (
                <PetActionRow
                  icon={ShieldCheck}
                  title="Public Safety"
                  status={safetyOpen ? "กำลังเปิดการตั้งค่า" : "ตั้งค่าในหน้านี้"}
                  description="เลือกข้อมูลที่ผู้พบเห็นได้จาก Public Safety QR"
                  onClick={() => setSafetyOpen((current) => !current)}
                  expanded={safetyOpen}
                />
              ) : (
                <PetActionRow
                  icon={ShieldCheck}
                  title="Public Safety"
                  status="มีเส้นทางตั้งค่า"
                  description="ตั้งค่าและดูตัวอย่างข้อมูลที่ผู้พบเห็นได้"
                  href={`/my-pets/${pet.prototypeSlug}/safety`}
                />
              )}
              {canShareWithBusiness ? (
                <PetActionRow
                  icon={Storefront}
                  title="Temporary Business Access"
                  status={activeTemporaryAccesses.length > 0 ? `${activeTemporaryAccesses.length} active` : "ยังไม่มี active access"}
                  description="เลือกธุรกิจ ขอบเขตข้อมูล และเวลาหมดอายุก่อนแชร์"
                  href={`/my-pets/${pet.prototypeSlug}/sharing`}
                />
              ) : null}
            </div>
            {isClaimedLocal && safetyOpen ? <div id="safety-settings" className="pet-inline-safety"><PetSafetyQuickPanel pet={pet} /></div> : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function DetailRecovery({ title, message, retry, showCreate = false, showDemo = false }: { title: string; message: string; retry?: () => void; showCreate?: boolean; showDemo?: boolean }) {
  return (
    <div className="consumer-page consumer-page--detail shell">
      <section className="consumer-recovery" role="alert">
        <CircleAlert size={40} weight="bold" />
        <p className="consumer-kicker">Pet Detail recovery</p>
        <h1>{title}</h1>
        <p>{message}</p>
        <div className="consumer-recovery__actions">
          {retry ? <button className="button button--primary" type="button" onClick={retry}>ลองอีกครั้ง</button> : null}
          {showCreate ? <a className="button button--primary" href="/create-passport"><PawPrint size={18} weight="bold" /> สร้าง Passport ใหม่</a> : null}
          {showDemo ? <a className="button button--ghost" href="/my-pets/demo-luna"><Eye size={18} weight="bold" /> ดูตัวอย่าง UI</a> : null}
          <a className="button button--ghost" href="/my-pets">กลับ My Pets</a>
        </div>
      </section>
    </div>
  );
}
