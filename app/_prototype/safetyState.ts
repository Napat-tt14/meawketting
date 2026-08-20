import type { ConsumerPet } from "./consumerPets";
import { getPrototypePetBySlug } from "./consumerPets";

export type SafetyStatus = "not-configured" | "active" | "disabled" | "lost";
export type PublicFieldKey = "photo" | "features" | "approach" | "emergency";
export type LeadTrust = "new" | "useful" | "suspicious";

export type PublicFields = Record<PublicFieldKey, boolean>;

export type LostDetails = {
  lastSeenAt: string;
  area: string;
  distinctiveFeatures: string;
  approach: string;
  photoName: string | null;
};

export type LostLead = {
  id: string;
  receivedAt: string;
  message: string;
  area: string;
  photoName: string | null;
  trust: LeadTrust;
};

export type LostCase = {
  phase: "draft" | "active" | "closed";
  activatedAt: string | null;
  closedAt: string | null;
  details: LostDetails;
  leads: LostLead[];
};

export type SafetyPrototypeState = {
  petSlug: string;
  status: SafetyStatus;
  lastChanged: string | null;
  publicFields: PublicFields;
  normalPublicFields?: PublicFields;
  features: string;
  approach: string;
  emergency: string;
  lostCase: LostCase | null;
};

// PROTOTYPE STATE ONLY. This same-tab state is not production persistence,
// authorization, a public-token security mechanism, or a retention policy.
export const SAFETY_STORAGE_KEY = "meawketting:safety-lost:prototype-v1";
export const PUBLIC_SAFETY_ID_PREFIX = "prototype-safety-";

const emptyFields: PublicFields = {
  photo: false,
  features: false,
  approach: false,
  emergency: false,
};

function demoLostCase(): LostCase {
  return {
    phase: "active",
    activatedAt: "2026-08-11T09:30:00.000Z",
    closedAt: null,
    details: {
      lastSeenAt: "2026-08-11T15:30",
      area: "บริเวณสวนสาธารณะใกล้ชุมชน",
      distinctiveFeatures: "ปลอกคอสีน้ำเงิน มีป้ายชื่อทรงกลม",
      approach: "ค่อย ๆ เข้าใกล้จากด้านข้าง และพูดด้วยเสียงเบา",
      photoName: null,
    },
    leads: [
      {
        id: "lead-suspicious-demo",
        receivedAt: "2026-08-11T11:05:00.000Z",
        message: "พบสัตว์คล้ายกัน แต่ขอให้โอนเงินก่อนจึงจะส่งตำแหน่ง",
        area: "ไม่ได้ระบุพื้นที่ที่ตรวจสอบได้",
        photoName: null,
        trust: "suspicious",
      },
      {
        id: "lead-near-park-demo",
        receivedAt: "2026-08-11T10:20:00.000Z",
        message: "เห็นสุนัขลักษณะคล้ายกันเดินอยู่ริมสวนช่วงประมาณห้าโมงเย็น",
        area: "ฝั่งประตูทิศเหนือของสวน",
        photoName: "finder-photo.jpg",
        trust: "new",
      },
    ],
  };
}

export function createDefaultSafetyState(pet: ConsumerPet): SafetyPrototypeState {
  if (pet.lifecycle === "lost") {
    return {
      petSlug: pet.prototypeSlug,
      status: "lost",
      lastChanged: "2026-08-11T09:30:00.000Z",
      publicFields: { photo: true, features: true, approach: true, emergency: true },
      normalPublicFields: { photo: true, features: true, approach: true, emergency: false },
      features: "ปลอกคอสีน้ำเงิน มีป้ายชื่อทรงกลม",
      approach: "ค่อย ๆ เข้าใกล้จากด้านข้าง และพูดด้วยเสียงเบา",
      emergency: "ติดต่อผู้ดูแลผ่านปุ่มส่งข้อความในหน้า Public Safety",
      lostCase: demoLostCase(),
    };
  }

  return {
    petSlug: pet.prototypeSlug,
    status: "not-configured",
    lastChanged: null,
    publicFields: { ...emptyFields },
    normalPublicFields: { ...emptyFields },
    features: "",
    approach: "",
    emergency: "",
    lostCase: null,
  };
}

function readAllStates(): Record<string, SafetyPrototypeState> {
  try {
    const raw = window.sessionStorage.getItem(SAFETY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? parsed as Record<string, SafetyPrototypeState> : {};
  } catch {
    return {};
  }
}

export function readSafetyPrototypeState(pet: ConsumerPet): SafetyPrototypeState {
  const stored = readAllStates()[pet.prototypeSlug];
  if (!stored || stored.petSlug !== pet.prototypeSlug) return createDefaultSafetyState(pet);
  return stored;
}

export function writeSafetyPrototypeState(state: SafetyPrototypeState) {
  const allStates = readAllStates();
  allStates[state.petSlug] = state;
  window.sessionStorage.setItem(SAFETY_STORAGE_KEY, JSON.stringify(allStates));
  window.dispatchEvent(new CustomEvent("meawketting:safety-state", { detail: { petSlug: state.petSlug } }));
}

export function publicSafetyIdForPet(petSlug: string) {
  return `${PUBLIC_SAFETY_ID_PREFIX}${petSlug}`;
}

export function petFromPublicSafetyId(publicId: string): ConsumerPet | null {
  if (!publicId.startsWith(PUBLIC_SAFETY_ID_PREFIX)) return null;
  const petSlug = publicId.slice(PUBLIC_SAFETY_ID_PREFIX.length);
  if (!petSlug || petSlug.includes("/") || petSlug.includes("..")) return null;
  return getPrototypePetBySlug(petSlug);
}

export function formatPrototypeDate(value: string | null) {
  if (!value) return "ยังไม่มีการเปลี่ยนแปลง";
  try {
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "เวลาในต้นแบบไม่พร้อมแสดง";
  }
}
