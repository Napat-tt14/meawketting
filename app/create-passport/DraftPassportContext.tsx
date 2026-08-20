"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PetSpecies = "cat" | "dog";
export type PassportStyle = "classic" | "booklet" | "sticker" | "polaroid" | "ticket" | "japan";

export type DraftPhoto = {
  dataUrl: string;
  fileName: string;
  /** Original source lets the user reopen the crop editor without losing the image. */
  originalDataUrl?: string;
};

export type DraftPassportState = {
  photo: DraftPhoto | null;
  petName: string;
  species: PetSpecies;
  prototypeId: string;
  prototypeClaimed: boolean;
  passportStyle: PassportStyle;
};

type DraftPassportContextValue = {
  draft: DraftPassportState;
  hydrated: boolean;
  storageWarning: string | null;
  setPhoto: (photo: DraftPhoto | null) => void;
  updateDetails: (details: { petName?: string; species?: PetSpecies; passportStyle?: PassportStyle }) => void;
  markPrototypeClaimed: () => void;
  resetDraft: () => void;
};

export const DRAFT_PASSPORT_STORAGE_KEY = "meawketting:create-passport:prototype-v1";

const initialDraft: DraftPassportState = {
  photo: null,
  petName: "",
  species: "cat",
  prototypeId: "PET-LOCAL-001",
  prototypeClaimed: false,
  passportStyle: "classic",
};

const DraftPassportContext = createContext<DraftPassportContextValue | null>(null);

function readStoredDraft(): DraftPassportState | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_PASSPORT_STORAGE_KEY);
    if (!raw) return null;

    const value = JSON.parse(raw) as Partial<DraftPassportState>;
    const species = value.species === "dog" ? "dog" : "cat";
    const photo = value.photo
      && typeof value.photo.dataUrl === "string"
      && value.photo.dataUrl.startsWith("data:image/")
      && typeof value.photo.fileName === "string"
      ? {
        dataUrl: value.photo.dataUrl,
        fileName: value.photo.fileName,
        originalDataUrl: typeof value.photo.originalDataUrl === "string"
          && value.photo.originalDataUrl.startsWith("data:image/")
          ? value.photo.originalDataUrl
          : value.photo.dataUrl,
      }
      : null;

    return {
      ...initialDraft,
      photo,
      petName: typeof value.petName === "string" ? value.petName : "",
      species,
      prototypeClaimed: value.prototypeClaimed === true,
      passportStyle: isPassportStyle(value.passportStyle) ? value.passportStyle : "classic",
    };
  } catch {
    return null;
  }
}

export function DraftPassportProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<DraftPassportState>(initialDraft);
  const [hydrated, setHydrated] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedDraft = readStoredDraft();
      if (storedDraft) setDraft(storedDraft);
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let nextWarning: string | null = null;
    try {
      // PROTOTYPE ONLY. This preserves the local journey in the current tab and
      // is not a production retention, expiry, upload, or persistence policy.
      window.sessionStorage.setItem(DRAFT_PASSPORT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      nextWarning = null;
    }

    const frame = window.requestAnimationFrame(() => setStorageWarning(nextWarning));
    return () => window.cancelAnimationFrame(frame);
  }, [draft, hydrated]);

  const setPhoto = useCallback((photo: DraftPhoto | null) => {
    setDraft((current) => ({
      ...current,
      photo,
      prototypeClaimed: false,
    }));
  }, []);

  const updateDetails = useCallback((details: { petName?: string; species?: PetSpecies; passportStyle?: PassportStyle }) => {
    setDraft((current) => ({
      ...current,
      ...details,
      prototypeClaimed: false,
    }));
  }, []);

  const markPrototypeClaimed = useCallback(() => {
    setDraft((current) => ({ ...current, prototypeClaimed: true }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(initialDraft);
  }, []);

  const value = useMemo<DraftPassportContextValue>(() => ({
    draft,
    hydrated,
    storageWarning,
    setPhoto,
    updateDetails,
    markPrototypeClaimed,
    resetDraft,
  }), [draft, hydrated, markPrototypeClaimed, resetDraft, setPhoto, storageWarning, updateDetails]);

  return (
    <DraftPassportContext.Provider value={value}>
      {children}
    </DraftPassportContext.Provider>
  );
}

function isPassportStyle(value: unknown): value is PassportStyle {
  return value === "classic" || value === "booklet" || value === "sticker"
    || value === "polaroid" || value === "ticket" || value === "japan";
}

export function useDraftPassport() {
  const context = useContext(DraftPassportContext);
  if (!context) {
    throw new Error("useDraftPassport must be used inside DraftPassportProvider");
  }
  return context;
}
