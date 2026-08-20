"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PassportCard, passportStyles, savePassportAsImage } from "../../_components/PassportCard";
import { Save } from "../../_components/icons";
import { GoogleAuthButton } from "../../_components/GoogleAuthButton";
import { useDraftPassport } from "../DraftPassportContext";
import { DraftRecovery } from "../_components/DraftRecovery";
import { FlowLoading } from "../_components/FlowLoading";

export function PassportPreviewStep() {
  const router = useRouter();
  const { draft, hydrated, updateDetails } = useDraftPassport();
  const [isNavigating, setIsNavigating] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "error">("idle");

  if (!hydrated) {
    return <FlowLoading label="กำลังเตรียม Passport ของน้อง" />;
  }

  if (!draft.photo || !draft.petName.trim()) {
    return (
      <DraftRecovery
        title="ยังเตรียม Passport ไม่เสร็จ"
        message="ต้องมีรูปและชื่อน้องก่อน หากเปิดหน้านี้โดยตรงให้กลับไปเริ่มจากขั้นเพิ่มรูป"
      />
    );
  }

  const speciesLabel = draft.species === "cat" ? "แมว / Cat" : "สุนัข / Dog";

  function continueToClaim() {
    if (isNavigating) return;
    setIsNavigating(true);
    router.push("/login?returnTo=%2Fmy-pets%2Fclaimed-local&intent=save-passport");
  }

  async function saveImage() {
    setSaveState("idle");
    try {
      const saved = await savePassportAsImage({
        style: draft.passportStyle,
        photoSrc: draft.photo?.dataUrl ?? null,
        name: draft.petName,
        speciesLabel,
        passportId: draft.prototypeId,
      });
      setSaveState(saved ? "idle" : "error");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <section className="passport-preview-flow page-reveal page-reveal--late" aria-label="เลือก Passport ให้น้อง">
      <div className="passport-preview-stage">
        <PassportCard
          style={draft.passportStyle}
          photoSrc={draft.photo?.dataUrl ?? null}
          name={draft.petName}
          speciesLabel={speciesLabel}
          passportId={draft.prototypeId}
          status="draft"
          showStatus={false}
        />
      </div>

      <aside className="passport-preview-controls" aria-label="ตัวเลือกและการบันทึก Passport">
        <fieldset className="passport-style-selector">
          <legend>สไตล์ Passport</legend>
          <div className="passport-style-selector__grid">
          {passportStyles.map((style) => {
            const selected = draft.passportStyle === style.id;
            return (
              <button
                type="button"
                className={`draft-passport-option${selected ? " is-selected" : ""}`}
                key={style.id}
                aria-pressed={selected}
                onClick={() => updateDetails({ passportStyle: style.id })}
              >
                <span>{style.name}</span>
              </button>
            );
          })}
          </div>
        </fieldset>

        <div className="preview-primary-actions">
          <button
            className="button button--paper button--large"
            type="button"
            onClick={() => void saveImage()}
          >
            <Save size={20} weight="bold" /> บันทึกภาพ
          </button>
          <GoogleAuthButton busy={isNavigating} onClick={continueToClaim} className="preview-google-action" />
        </div>
        <p className="passport-save-status" role="status" aria-live="polite">
          {saveState === "error" ? "บันทึกภาพไม่สำเร็จ ลองอีกครั้ง" : ""}
        </p>
      </aside>
    </section>
  );
}
