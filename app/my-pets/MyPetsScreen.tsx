"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConsumerPet, PrototypeFixture } from "../_prototype/consumerPets";
import { getPrototypeFixturePets, parsePrototypeFixture, readClaimedPrototypePet } from "../_prototype/consumerPets";
import { Archive, CircleAlert, Eye, IdentificationCard, PawPrint, Plus, ShieldAlert } from "../_components/icons";
import { PetCard } from "./_components/PetCard";

type ViewState = "loading" | "ready" | "error" | "permission-denied";

export function MyPetsScreen() {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [pets, setPets] = useState<ConsumerPet[]>([]);
  const [fixture, setFixture] = useState<PrototypeFixture>(null);
  const [filter, setFilter] = useState<"active" | "archived">("active");

  const load = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const fixtureName = params.get("fixture");
    if (fixtureName === "error") {
      setViewState("error");
      return;
    }
    if (fixtureName === "denied") {
      setViewState("permission-denied");
      return;
    }
    const parsedFixture = parsePrototypeFixture(fixtureName);
    const fixturePets = getPrototypeFixturePets(parsedFixture);
    const claimedPet = readClaimedPrototypePet();
    setFixture(parsedFixture);
    setPets(fixturePets ?? (claimedPet ? [claimedPet] : []));
    setViewState("ready");
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(load);
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  const retryFromError = useCallback(() => {
    window.history.replaceState({}, "", window.location.pathname);
    load();
  }, [load]);

  const hasArchived = pets.some((pet) => pet.lifecycle === "archived" || pet.lifecycle === "transferred");
  const visiblePets = useMemo(() => pets.filter((pet) => filter === "archived"
    ? pet.lifecycle === "archived" || pet.lifecycle === "transferred"
    : pet.lifecycle !== "archived" && pet.lifecycle !== "transferred"), [filter, pets]);
  const lostCount = pets.filter((pet) => pet.lifecycle === "lost").length;

  if (viewState === "loading") {
    return (
      <div className="consumer-page shell" aria-busy="true">
        <header className="consumer-page__heading"><p className="consumer-kicker">My Pets</p><h1>Passport ของน้อง ๆ</h1></header>
        <div className="pet-list-skeleton" aria-label="กำลังโหลดสัตว์เลี้ยง">
          {[0, 1].map((item) => <span key={item} className="pet-card-skeleton" />)}
        </div>
      </div>
    );
  }

  if (viewState === "permission-denied") {
    return <ConsumerRecovery title="ยังเปิดรายการนี้ไม่ได้" message="ต้นแบบนี้ไม่พบความสัมพันธ์ผู้ดูแลที่อนุญาตให้แสดงข้อมูล จึงไม่ได้แสดงชื่อหรือรูปสัตว์เลี้ยง" />;
  }

  if (viewState === "error") {
    return (
      <ConsumerRecovery
        title="โหลดรายการสัตว์เลี้ยงไม่สำเร็จ"
        message="ข้อมูลต้นแบบในแท็บนี้ยังไม่ถูกลบ ลองอ่านข้อมูลอีกครั้ง หรือกลับมาที่ My Pets โดยไม่ใช้สถานะทดสอบ"
        retry={retryFromError}
      />
    );
  }

  return (
    <div className="consumer-page shell">
      <header className="consumer-page__heading">
        <div><p className="consumer-kicker">My Pets</p><h1>Passport ของน้อง ๆ</h1><p>รวมตัวตนและเรื่องสำคัญของสมาชิกทุกคนไว้ในที่เดียว</p></div>
      </header>

      {pets.length > 0 ? <section className="my-pets-overview" aria-label="สรุป Passport"><span className="my-pets-overview__icon"><IdentificationCard size={28} weight="bold" /></span><div><strong>{pets.length}</strong><span>Passport ในการดูแล</span></div><p>แตะการ์ดเพื่อดู Passport พลิก Quick QR หรือเปิดข้อมูลการดูแล</p></section> : null}

      {fixture ? <p className="qa-fixture-label"><CircleAlert size={17} weight="bold" /> QA fixture: {fixture} — ไม่ใช่ข้อมูลจากผู้ใช้จริง</p> : null}

      {lostCount > 0 ? (
        <section className="consumer-alert consumer-alert--lost" aria-labelledby="lost-pet-heading">
          <ShieldAlert size={24} weight="bold" />
          <div><h2 id="lost-pet-heading">มีสัตว์เลี้ยงที่กำลังตามหา {lostCount} ตัว</h2><p>สถานะนี้ถูกยกขึ้นมาให้เห็นชัดก่อนข้อมูลตกแต่งอื่น ๆ เปิด Pet Detail เพื่อเข้า Lost Case Dashboard และดูเบาะแส</p></div>
        </section>
      ) : null}

      {pets.length === 0 ? (
        <section className="pet-empty-state">
          <span className="pet-empty-state__mark"><PawPrint size={40} weight="bold" /></span>
          <p className="consumer-kicker">เริ่มต้นที่พาสปอร์ตใบแรก</p>
          <h2>ตรงนี้ยังว่าง รอสมาชิกคนแรกอยู่</h2>
          <p>เริ่มด้วยรูปกับชื่อก่อน แล้ว Passport ใบแรกจะย้ายมาอยู่ตรงนี้เอง</p>
          <div className="pet-empty-state__actions">
            <a className="button button--primary button--large" href="/create-passport"><Plus size={20} weight="bold" /> สร้าง Pet Passport</a>
            <a className="button button--ghost button--large" href="/my-pets/demo-luna"><Eye size={20} weight="bold" /> ดูตัวอย่าง UI</a>
          </div>
        </section>
      ) : (
        <section className="pet-list-section" aria-labelledby="pet-list-heading">
          <div className="pet-list-toolbar">
            <div><p className="consumer-kicker">อยู่ในการดูแล</p><h2 id="pet-list-heading">วันนี้จะเข้าไปหาใครดี?</h2></div>
            {hasArchived ? (
              <div className="pet-filter" aria-label="กรองสถานะสัตว์เลี้ยง">
                <button type="button" className={filter === "active" ? "is-active" : ""} aria-pressed={filter === "active"} onClick={() => setFilter("active")}>กำลังดูแล</button>
                <button type="button" className={filter === "archived" ? "is-active" : ""} aria-pressed={filter === "archived"} onClick={() => setFilter("archived")}><Archive size={17} weight="bold" /> เก็บถาวร</button>
              </div>
            ) : null}
          </div>
          <a className="button button--secondary my-pets-add-action" href="/create-passport"><Plus size={18} weight="bold" /> เพิ่มสัตว์เลี้ยง</a>
          {visiblePets.length > 0 ? <ul className="pet-list">{visiblePets.map((pet) => <PetCard key={pet.prototypeSlug} pet={pet} fixture={fixture} />)}</ul> : <p className="pet-filter-empty">ไม่มีสัตว์เลี้ยงในสถานะนี้</p>}
        </section>
      )}

    </div>
  );
}

function ConsumerRecovery({ title, message, retry }: { title: string; message: string; retry?: () => void }) {
  return (
    <div className="consumer-page shell">
      <section className="consumer-recovery" role="alert">
        <CircleAlert size={40} weight="bold" />
        <p className="consumer-kicker">Recovery</p>
        <h1>{title}</h1>
        <p>{message}</p>
        <div className="consumer-recovery__actions">
          {retry ? <button className="button button--primary" type="button" onClick={retry}>ลองอีกครั้ง</button> : null}
          <a className="button button--ghost" href="/my-pets">กลับ My Pets</a>
        </div>
      </section>
    </div>
  );
}
