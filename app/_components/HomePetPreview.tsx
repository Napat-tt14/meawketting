"use client";

import {
  Cat,
  CheckCircle,
  Dog,
  IdentificationCard,
  PawPrint,
  ShieldCheck,
  Sparkle,
} from "./icons";
import Image from "next/image";
import { useState } from "react";

const pets = {
  cat: {
    name: "Mochi",
    breed: "British Shorthair",
    age: "2 ปี",
    id: "PP-2026-000789",
    Icon: Cat,
  },
  dog: {
    name: "Milo",
    breed: "Golden Retriever",
    age: "3 ปี",
    id: "PP-2026-000842",
    Icon: Dog,
  },
} as const;

export function HomePetPreview() {
  const [species, setSpecies] = useState<keyof typeof pets>("cat");
  const pet = pets[species];
  const PetIcon = pet.Icon;

  return (
    <div className="hero-visual page-reveal page-reveal--late">
      <div className="pet-switch" aria-label="เลือกชนิดสัตว์">
        <button
          type="button"
          className={species === "cat" ? "is-active" : undefined}
          aria-pressed={species === "cat"}
          onClick={() => setSpecies("cat")}
        >
          <Cat size={18} weight="bold" /> แมว
        </button>
        <button
          type="button"
          className={species === "dog" ? "is-active" : undefined}
          aria-pressed={species === "dog"}
          onClick={() => setSpecies("dog")}
        >
          <Dog size={18} weight="bold" /> สุนัข
        </button>
      </div>

      <div className="hero-image-wrap">
        <Image
          src="/images/hero-care-v1.png"
          alt="ผู้ดูแลนั่งอยู่ในบ้านกับแมวและสุนัขในบรรยากาศอบอุ่น"
          fill
          priority
          sizes="(max-width: 900px) 100vw, 52vw"
          className="hero-image"
        />
        <span className="floating-spark floating-spark--one" aria-hidden="true"><Sparkle size={23} weight="fill" /></span>
        <span className="floating-spark floating-spark--two" aria-hidden="true"><PawPrint size={21} /></span>
      </div>

      <article className="passport-float" aria-live="polite">
        <div className="passport-float__top">
          <span><PawPrint size={18} /> Pet Passport</span>
          <IdentificationCard size={22} weight="duotone" />
        </div>
        <div className="passport-float__pet">
          <span className="pet-avatar" aria-hidden="true"><PetIcon size={42} weight="duotone" /></span>
          <div>
            <strong>{pet.name}</strong>
            <span>{pet.breed} · {pet.age}</span>
          </div>
          <span className="status-badge status-badge--active"><span /> โปรไฟล์พร้อมแชร์</span>
        </div>
        <dl className="passport-float__facts">
          <div><dt><ShieldCheck size={15} /> Passport ID</dt><dd>{pet.id}</dd></div>
          <div><dt><CheckCircle size={15} /> Care status</dt><dd>พร้อมแชร์</dd></div>
        </dl>
      </article>
    </div>
  );
}
