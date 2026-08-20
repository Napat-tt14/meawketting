import type { PassportStyle, PetSpecies } from "../create-passport/DraftPassportContext";

export type PetLifecycle = "active" | "lost" | "memorial" | "archived" | "transferred";
export type GuardianRole = "primary" | "co-guardian";

export type ConsumerPet = {
  prototypeSlug: string;
  name: string;
  species: PetSpecies;
  photoSrc: string | null;
  lifecycle: PetLifecycle;
  guardianRole: GuardianRole;
  passportLabel: string;
  profileIncomplete?: boolean;
  passportStyle?: PassportStyle;
  passportId?: string;
};

type StoredDraft = {
  photo?: { dataUrl?: unknown; fileName?: unknown } | null;
  petName?: unknown;
  species?: unknown;
  prototypeClaimed?: unknown;
  passportStyle?: unknown;
  prototypeId?: unknown;
};

// PROTOTYPE ONLY. Shared with the Phase A draft journey. This is same-tab
// browser state, not production persistence, authorization, or ownership.
export const PROTOTYPE_DRAFT_STORAGE_KEY = "meawketting:create-passport:prototype-v1";
export const CLAIMED_PET_SLUG = "claimed-local";

export function readClaimedPrototypePet(): ConsumerPet | null {
  try {
    const raw = window.sessionStorage.getItem(PROTOTYPE_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as StoredDraft;
    const name = typeof draft.petName === "string" ? draft.petName.trim() : "";
    if (!name || draft.prototypeClaimed !== true) return null;

    const photoSrc = draft.photo
      && typeof draft.photo.dataUrl === "string"
      && draft.photo.dataUrl.startsWith("data:image/")
      ? draft.photo.dataUrl
      : null;

    return {
      prototypeSlug: CLAIMED_PET_SLUG,
      name,
      species: draft.species === "dog" ? "dog" : "cat",
      photoSrc,
      lifecycle: "active",
      guardianRole: "primary",
      passportLabel: "Passport",
      profileIncomplete: true,
      passportStyle: isPassportStyle(draft.passportStyle) ? draft.passportStyle : "classic",
      passportId: typeof draft.prototypeId === "string" ? draft.prototypeId : "PET-LOCAL-001",
    };
  } catch {
    return null;
  }
}

function isPassportStyle(value: unknown): value is PassportStyle {
  return value === "classic" || value === "booklet" || value === "sticker"
    || value === "polaroid" || value === "ticket" || value === "japan";
}

const demoPets: ConsumerPet[] = [
  {
    prototypeSlug: "demo-luna",
    name: "ลูน่า",
    species: "cat",
    photoSrc: "/images/hero-care-v1.png",
    lifecycle: "active",
    guardianRole: "primary",
    passportLabel: "QA fixture passport",
  },
  {
    prototypeSlug: "demo-milo",
    name: "ไมโล",
    species: "dog",
    photoSrc: "/images/hero-care-v1.png",
    lifecycle: "lost",
    guardianRole: "co-guardian",
    passportLabel: "QA fixture passport",
  },
  {
    prototypeSlug: "demo-cloud",
    name: "คลาวด์",
    species: "cat",
    photoSrc: null,
    lifecycle: "archived",
    guardianRole: "primary",
    passportLabel: "QA fixture passport",
  },
  {
    prototypeSlug: "demo-mali",
    name: "มะลิ",
    species: "cat",
    photoSrc: null,
    lifecycle: "memorial",
    guardianRole: "primary",
    passportLabel: "QA fixture passport",
  },
  {
    prototypeSlug: "demo-nori",
    name: "โนริ",
    species: "dog",
    photoSrc: null,
    lifecycle: "transferred",
    guardianRole: "co-guardian",
    passportLabel: "QA fixture passport",
  },
];

export function getPrototypePetBySlug(petSlug: string): ConsumerPet | null {
  const claimedPet = readClaimedPrototypePet();
  if (claimedPet?.prototypeSlug === petSlug) return claimedPet;
  return demoPets.find((pet) => pet.prototypeSlug === petSlug) ?? null;
}

export type PrototypeFixture = "multiple" | "empty" | "lost" | "archived" | "memorial" | "transferred" | null;

export function getPrototypeFixturePets(fixture: PrototypeFixture): ConsumerPet[] | null {
  if (!fixture) return null;
  if (fixture === "empty") return [];
  if (fixture === "multiple") return demoPets;
  const lifecycle = fixture;
  return demoPets.filter((pet) => pet.lifecycle === lifecycle);
}

export function parsePrototypeFixture(value: string | null): PrototypeFixture {
  if (value === "multiple" || value === "empty" || value === "lost" || value === "archived" || value === "memorial" || value === "transferred") {
    return value;
  }
  return null;
}

export function speciesLabel(species: PetSpecies) {
  return species === "cat" ? "แมว" : "สุนัข";
}

export function guardianRoleLabel(role: GuardianRole) {
  return role === "primary" ? "ผู้ดูแลหลัก" : "ผู้ดูแลร่วม";
}
