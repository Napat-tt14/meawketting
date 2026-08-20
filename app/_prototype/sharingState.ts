import type { ConsumerPet } from "./consumerPets";

export type BusinessVerification = "verified" | "unverified" | "pending" | "suspended";
export type BusinessRequestMode = "direct" | "additional-owner-decision";

export type BusinessBranch = {
  id: string;
  name: string;
  area: string;
  demoCode: string;
};

export type BusinessFixture = {
  id: string;
  name: string;
  type: string;
  verification: BusinessVerification;
  verificationExplanation: string;
  purpose: string;
  requestMode: BusinessRequestMode;
  branches: BusinessBranch[];
};

// Fictional businesses for UI QA only. Verification is a prototype status and
// never represents a quality guarantee, real registry, or Business membership.
export const BUSINESS_FIXTURES: BusinessFixture[] = [
  {
    id: "business-whisker-rest",
    name: "Whisker Rest Demo",
    type: "Cat hotel",
    verification: "verified",
    verificationExplanation: "ตรวจข้อมูลระบุตัวตนใน fixture แล้ว ไม่ใช่การรับรองคุณภาพบริการ",
    purpose: "อ่านข้อมูลที่ผู้ดูแลอนุญาตเพื่อเตรียมการดูแลชั่วคราว",
    requestMode: "direct",
    branches: [
      { id: "whisker-ari", name: "สาขาอารีย์ (Demo)", area: "เขตพญาไท", demoCode: "WR-ARI" },
      { id: "whisker-thonglor", name: "สาขาทองหล่อ (Demo)", area: "เขตวัฒนา", demoCode: "WR-TL" },
      { id: "whisker-bangna", name: "สาขาบางนา (Demo)", area: "เขตบางนา", demoCode: "WR-BN" },
    ],
  },
  {
    id: "business-gentle-groom",
    name: "Gentle Groom Demo",
    type: "Grooming",
    verification: "verified",
    verificationExplanation: "ตรวจข้อมูลระบุตัวตนใน fixture แล้ว ไม่ใช่การรับรองผลลัพธ์หรือความปลอดภัยทั้งหมด",
    purpose: "อ่านข้อมูลที่ผู้ดูแลเลือกไว้ก่อนการนัดหมายดูแลขน",
    requestMode: "direct",
    branches: [
      { id: "gentle-rama9", name: "สาขาพระราม 9 (Demo)", area: "เขตห้วยขวาง", demoCode: "GG-R9" },
    ],
  },
  {
    id: "business-paw-partner",
    name: "Paw Partner Demo",
    type: "Pet sitter",
    verification: "unverified",
    verificationExplanation: "ยังไม่ได้ตรวจ fixture ครบ สถานะนี้ไม่ได้แปลว่าไม่ปลอดภัย โปรดทบทวนชื่อและสาขาให้ชัด",
    purpose: "อ่านข้อมูลที่ผู้ดูแลอนุญาตสำหรับการดูแลชั่วคราว",
    requestMode: "additional-owner-decision",
    branches: [
      { id: "partner-onnut", name: "ทีมอ่อนนุช (Demo)", area: "เขตสวนหลวง", demoCode: "PP-ON" },
    ],
  },
  {
    id: "business-whisker-rest-similar",
    name: "Whisker Rest Demo",
    type: "Pet sitter",
    verification: "pending",
    verificationExplanation: "กำลังตรวจข้อมูล fixture ชื่อคล้ายอีกรายการ จึงต้องยืนยันสาขาก่อนเลือก",
    purpose: "อ่านข้อมูลที่ผู้ดูแลอนุญาตสำหรับการดูแลชั่วคราว",
    requestMode: "additional-owner-decision",
    branches: [
      { id: "whisker-ladprao", name: "ทีมลาดพร้าว (Demo)", area: "เขตลาดพร้าว", demoCode: "WR-LP" },
    ],
  },
  {
    id: "business-quiet-paws",
    name: "Quiet Paws Demo",
    type: "Grooming",
    verification: "suspended",
    verificationExplanation: "ระงับ fixture นี้เพื่อทดสอบ blocker จึงยังสร้าง Temporary Access ต่อไม่ได้",
    purpose: "อ่านข้อมูลที่ผู้ดูแลเลือกไว้ก่อนการนัดหมาย",
    requestMode: "direct",
    branches: [
      { id: "quiet-demo", name: "สาขาทดสอบ (Demo)", area: "Prototype fixture", demoCode: "QP-HOLD" },
    ],
  },
];

export type ShareableScopeKey = "basicIdentity" | "photo" | "passportReference";

export type SharingDraft = {
  petSlug: string;
  businessId: string | null;
  branchId: string | null;
  selectedScope: Record<ShareableScopeKey, boolean>;
  durationMinutes: number | null;
  durationChosenAt: string | null;
};

export type AccessStatus = "ready" | "active" | "awaiting-owner" | "revoked" | "expired" | "denied" | "cancelled";
export type ConsentStatus = "owner-consented" | "additional-decision-needed" | "approved" | "denied";
export type AccessEventType = "created" | "gateway-checked" | "request-sent" | "approved" | "denied" | "viewed" | "revoked" | "revoke-failed";

export type TemporaryAccessGateState =
  | "valid"
  | "invalid"
  | "expired"
  | "revoked"
  | "wrong-business"
  | "suspicious"
  | "network-error";

export type AccessEvent = {
  id: string;
  type: AccessEventType;
  occurredAt: string;
  actor: string;
  summary: string;
};

export type TemporaryAccess = {
  id: string;
  fallbackCode: string;
  petSlug: string;
  businessId: string;
  branchId: string;
  purpose: string;
  scope: ShareableScopeKey[];
  createdAt: string;
  expiresAt: string;
  status: AccessStatus;
  consentStatus: ConsentStatus;
  requester: string | null;
  decisionAt: string | null;
  revokedAt: string | null;
  events: AccessEvent[];
};

type SharingStore = {
  drafts: Record<string, SharingDraft>;
  accesses: Record<string, TemporaryAccess>;
};

export const SHARING_STORAGE_KEY = "meawketting:business-sharing:prototype-v1";
export const DURATION_PRESETS = [120, 480, 1440] as const;

const emptyStore = (): SharingStore => ({ drafts: {}, accesses: {} });

export function createDefaultSharingDraft(petSlug: string): SharingDraft {
  return {
    petSlug,
    businessId: null,
    branchId: null,
    selectedScope: {
      basicIdentity: true,
      photo: false,
      passportReference: false,
    },
    durationMinutes: null,
    durationChosenAt: null,
  };
}

function readStore(): SharingStore {
  try {
    const raw = window.sessionStorage.getItem(SHARING_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<SharingStore>;
    return {
      drafts: parsed.drafts && typeof parsed.drafts === "object" ? parsed.drafts : {},
      accesses: parsed.accesses && typeof parsed.accesses === "object" ? parsed.accesses : {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: SharingStore) {
  try {
    window.sessionStorage.setItem(SHARING_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent("meawketting:sharing-state"));
    return true;
  } catch {
    return false;
  }
}

export function readSharingDraft(petSlug: string): SharingDraft {
  const stored = readStore().drafts[petSlug];
  if (!stored || stored.petSlug !== petSlug) return createDefaultSharingDraft(petSlug);
  return {
    ...createDefaultSharingDraft(petSlug),
    ...stored,
    selectedScope: { ...createDefaultSharingDraft(petSlug).selectedScope, ...stored.selectedScope, basicIdentity: true },
  };
}

export function writeSharingDraft(draft: SharingDraft) {
  const store = readStore();
  store.drafts[draft.petSlug] = { ...draft, selectedScope: { ...draft.selectedScope, basicIdentity: true } };
  return writeStore(store);
}

export function clearSharingDraft(petSlug: string) {
  const store = readStore();
  delete store.drafts[petSlug];
  return writeStore(store);
}

export function getBusinessFixture(businessId: string | null) {
  return BUSINESS_FIXTURES.find((business) => business.id === businessId) ?? null;
}

export function getBusinessBranch(business: BusinessFixture | null, branchId: string | null) {
  return business?.branches.find((branch) => branch.id === branchId) ?? null;
}

export function getDraftExpiry(draft: SharingDraft) {
  if (!draft.durationMinutes || !draft.durationChosenAt) return null;
  const chosen = new Date(draft.durationChosenAt).getTime();
  if (!Number.isFinite(chosen)) return null;
  return new Date(chosen + draft.durationMinutes * 60_000).toISOString();
}

export function selectedScopeKeys(draft: SharingDraft): ShareableScopeKey[] {
  return (["basicIdentity", "photo", "passportReference"] as const).filter((key) => draft.selectedScope[key]);
}

function event(type: AccessEventType, actor: string, summary: string, occurredAt = new Date().toISOString()): AccessEvent {
  return {
    id: `${type}-${occurredAt}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    occurredAt,
    actor,
    summary,
  };
}

export function createTemporaryAccess(pet: ConsumerPet, draft: SharingDraft): TemporaryAccess | null {
  const business = getBusinessFixture(draft.businessId);
  const branch = getBusinessBranch(business, draft.branchId);
  const expiresAt = getDraftExpiry(draft);
  if (!business || !branch || business.verification === "suspended" || !expiresAt) return null;

  const createdAt = new Date().toISOString();
  const suffix = Date.now().toString(36).toUpperCase();
  const access: TemporaryAccess = {
    id: `prototype-access-${suffix.toLowerCase()}`,
    fallbackCode: `DEMO-${suffix.slice(-6)}`,
    petSlug: pet.prototypeSlug,
    businessId: business.id,
    branchId: branch.id,
    purpose: business.purpose,
    scope: selectedScopeKeys(draft),
    createdAt,
    expiresAt,
    status: business.requestMode === "additional-owner-decision" ? "ready" : "active",
    consentStatus: business.requestMode === "additional-owner-decision" ? "additional-decision-needed" : "owner-consented",
    requester: null,
    decisionAt: null,
    revokedAt: null,
    events: [event("created", "Primary Guardian (Prototype)", "สร้าง Temporary Business QR พร้อมขอบเขตและวันหมดอายุ")],
  };

  const store = readStore();
  store.accesses[access.id] = access;
  return writeStore(store) ? access : null;
}

export function presentationStatus(access: TemporaryAccess): AccessStatus {
  if ((access.status === "ready" || access.status === "active" || access.status === "awaiting-owner") && Date.parse(access.expiresAt) <= Date.now()) {
    return "expired";
  }
  return access.status;
}

export function readTemporaryAccess(accessId: string): TemporaryAccess | null {
  const access = readStore().accesses[accessId];
  if (!access || access.id !== accessId) return null;
  return { ...access, status: presentationStatus(access) };
}

export function findTemporaryAccessByFallbackCode(fallbackCode: string): TemporaryAccess | null {
  const normalized = fallbackCode.trim().toUpperCase();
  if (!normalized) return null;
  const access = Object.values(readStore().accesses).find((item) => item.fallbackCode.toUpperCase() === normalized);
  return access ? { ...access, status: presentationStatus(access) } : null;
}

export function evaluateTemporaryAccess(
  access: TemporaryAccess | null,
  businessId?: string,
  branchId?: string,
): TemporaryAccessGateState {
  if (!access) return "invalid";
  const status = presentationStatus(access);
  if (status === "expired") return "expired";
  if (status === "revoked") return "revoked";
  if (status === "denied" || status === "cancelled") return "invalid";
  if ((businessId && access.businessId !== businessId) || (branchId && access.branchId !== branchId)) {
    return "wrong-business";
  }
  return "valid";
}

export function listTemporaryAccessForPet(petSlug: string): TemporaryAccess[] {
  return Object.values(readStore().accesses)
    .filter((access) => access.petSlug === petSlug)
    .map((access) => ({ ...access, status: presentationStatus(access) }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function updateTemporaryAccess(access: TemporaryAccess) {
  const store = readStore();
  store.accesses[access.id] = access;
  return writeStore(store);
}

export function addAccessEvent(access: TemporaryAccess, type: AccessEventType, actor: string, summary: string) {
  return {
    ...access,
    events: [...access.events, event(type, actor, summary)],
  };
}

export function formatSharingDate(value: string | null) {
  if (!value) return "ยังไม่ได้กำหนด";
  try {
    return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return "เวลาในต้นแบบไม่พร้อมแสดง";
  }
}

export function browserTimezoneLabel() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Browser local time";
  } catch {
    return "Browser local time";
  }
}

export function scopeLabel(key: ShareableScopeKey) {
  if (key === "basicIdentity") return "ชื่อและชนิดสัตว์เลี้ยง";
  if (key === "photo") return "รูปสัตว์เลี้ยง";
  return "ข้อมูลอ้างอิง Pet Passport";
}

export function accessStatusLabel(status: AccessStatus) {
  if (status === "ready") return "พร้อมให้ Business ขอสิทธิ์";
  if (status === "active") return "Active · เข้าถึงได้ชั่วคราว";
  if (status === "awaiting-owner") return "รอ Guardian ตัดสินใจ";
  if (status === "revoked") return "ยกเลิกสิทธิ์แล้ว";
  if (status === "expired") return "หมดอายุแล้ว";
  if (status === "denied") return "Guardian ปฏิเสธคำขอ";
  return "ยกเลิกคำขอแล้ว";
}
