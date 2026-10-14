import type { PetPassportConnectionState } from "./businessState";
import { BUSINESS_FIXTURE_TEST_MODE } from "./fixtureRuntime";

export type NonAuthoritativePassportCompatibility = {
  passportConnection: PetPassportConnectionState;
  passportSlug: string | null;
};

/**
 * DEV PROTOTYPE / NON-AUTHORITATIVE READ MODEL ONLY.
 *
 * These values preserve frozen BF3 Passport/access presentation for seeded
 * Pet IDs. They are not returned by BE2, persisted in D1, or usable as
 * Guardian, ownership, consent, QR, or access-grant authority.
 */
const PASSPORT_COMPATIBILITY_BY_PET_ID: Readonly<Record<string, NonAuthoritativePassportCompatibility>> = {
  "booking-pet-mochi": { passportConnection: "linked-no-access", passportSlug: null },
  "booking-pet-milo": { passportConnection: "unlinked", passportSlug: null },
  "booking-pet-biscuit": { passportConnection: "unlinked", passportSlug: null },
  "booking-pet-luna": { passportConnection: "linked-active", passportSlug: "demo-luna" },
  "booking-pet-tofu": { passportConnection: "access-expired", passportSlug: null },
  "booking-pet-pudding": { passportConnection: "unlinked", passportSlug: null },
  "booking-pet-maple": { passportConnection: "unlinked", passportSlug: null },
  "booking-pet-leo": { passportConnection: "linked-no-access", passportSlug: null },
};

const UNLINKED_COMPATIBILITY: NonAuthoritativePassportCompatibility = {
  passportConnection: "unlinked",
  passportSlug: null,
};

export function readNonAuthoritativePassportCompatibility(petId: string) {
  return BUSINESS_FIXTURE_TEST_MODE ? PASSPORT_COMPATIBILITY_BY_PET_ID[petId] ?? UNLINKED_COMPATIBILITY : UNLINKED_COMPATIBILITY;
}
