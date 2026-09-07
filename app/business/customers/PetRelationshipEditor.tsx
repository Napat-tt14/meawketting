"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import type { BusinessLocalPetRelationship, PrototypeCustomer } from "../../_prototype/businessState";
import { readPrototypeCustomer } from "../../_prototype/businessState";
import { createDurablePet } from "../../_backend/be2/client";
import { CircleAlert, Plus, X } from "../../_components/icons";

export function PetRelationshipEditor({
  customer,
  embedded = false,
  onClose,
  onSaved,
}: {
  customer: PrototypeCustomer;
  /** Render inside the booking drawer instead of opening a second viewport modal. */
  embedded?: boolean;
  onClose: () => void;
  onSaved: (customer: PrototypeCustomer, pet: BusinessLocalPetRelationship) => void;
}) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"cat" | "dog">("cat");
  const [businessNote, setBusinessNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    if (!embedded) document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    function handleKeys(event: KeyboardEvent) {
      if (embedded || event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea:not([disabled])")]
        .filter((element) => !element.closest("[inert]") && element.getClientRects().length > 0 && element.tabIndex !== -1);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeys);
    return () => {
      window.cancelAnimationFrame(frame);
      if (!embedded) document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeys);
      window.requestAnimationFrame(() => { if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus(); });
    };
  }, [embedded]);

  async function persist(allowPotentialDuplicate: boolean) {
    if (saving) return;
    if (!name.trim()) {
      setError("กรอกชื่อน้องก่อนบันทึก");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await createDurablePet({
        businessId: customer.businessId,
        customerId: customer.id,
        name,
        species,
        businessNotes: businessNote,
        allowPotentialDuplicate,
      });
      if (result.outcome === "duplicate-warning") {
        setDuplicate({ id: result.warning.duplicate.id, name: result.warning.duplicate.name });
        return;
      }
      const updated = readPrototypeCustomer(result.customer.id);
      const pet = updated?.pets.find((entry) => entry.id === result.pet.id) ?? null;
      if (!updated || !pet) throw new Error("Pet cache was not updated.");
      onSaved(updated, pet);
    } catch {
      setError("บันทึกข้อมูลไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void persist(false);
  }

  return (
    <>
      {embedded ? null : <button className="customer-editor__backdrop" type="button" tabIndex={-1} aria-label="ปิดแบบฟอร์มสัตว์เลี้ยง" onClick={onClose} />}
      <section ref={dialogRef} className={`customer-editor customer-editor--pet${embedded ? " customer-editor--embedded" : ""}`} role={embedded ? "region" : "dialog"} aria-modal={embedded ? undefined : "true"} aria-labelledby="pet-relationship-editor-title">
        <header className="customer-editor__header">
          <h2 id="pet-relationship-editor-title">เพิ่มสัตว์เลี้ยง</h2>
          <button ref={closeButtonRef} type="button" aria-label="ปิดแบบฟอร์มสัตว์เลี้ยง" onClick={onClose}><X size={20} /></button>
        </header>
        <form className="customer-editor__form" onSubmit={submit} noValidate>
          <label className="customer-editor__field" htmlFor="customer-pet-name">
            <span>ชื่อ <b aria-hidden="true">*</b><i className="sr-only">จำเป็น</i></span>
            <input id="customer-pet-name" value={name} required aria-invalid={Boolean(error && !name.trim())} aria-describedby={error && !name.trim() ? "pet-relationship-editor-error" : undefined} onInput={(event) => { setName(event.currentTarget.value); setError(null); setDuplicate(null); }} />
          </label>
          <fieldset className="customer-editor__species">
            <legend>ชนิดสัตว์</legend>
            <div>
              <label><input type="radio" name="customer-pet-species" value="cat" checked={species === "cat"} onChange={() => { setSpecies("cat"); setDuplicate(null); }} />แมว</label>
              <label><input type="radio" name="customer-pet-species" value="dog" checked={species === "dog"} onChange={() => { setSpecies("dog"); setDuplicate(null); }} />สุนัข</label>
            </div>
          </fieldset>
          <label className="customer-editor__field" htmlFor="customer-pet-note">
            <span>หมายเหตุของร้าน <small>ไม่บังคับ</small></span>
            <textarea id="customer-pet-note" value={businessNote} rows={3} onInput={(event) => setBusinessNote(event.currentTarget.value)} />
          </label>
          {error ? <p id="pet-relationship-editor-error" className="customer-editor__error" role="alert"><CircleAlert size={18} />{error}</p> : null}
          {duplicate ? (
            <section className="customer-duplicate-warning" role="alert" aria-labelledby="pet-duplicate-title">
              <CircleAlert size={20} />
              <div>
                <strong id="pet-duplicate-title">อาจมีสัตว์เลี้ยงตัวนี้อยู่แล้ว</strong>
                <p>พบชื่อ {duplicate.name} ชนิดเดียวกันในข้อมูลของร้าน โปรดตรวจสอบก่อนสร้างรายการใหม่</p>
                <div><button type="button" disabled={saving} onClick={() => void persist(true)}>สร้างต่อ</button></div>
              </div>
            </section>
          ) : null}
          <footer className="customer-editor__actions">
            <button className="button button--business-ghost" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="button button--business" type="submit" disabled={saving}><Plus size={18} />{saving ? "กำลังบันทึก…" : "เพิ่มสัตว์เลี้ยง"}</button>
          </footer>
        </form>
      </section>
    </>
  );
}
