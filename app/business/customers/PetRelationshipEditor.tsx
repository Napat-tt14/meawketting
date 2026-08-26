"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import type { PrototypeCustomer } from "../../_prototype/businessState";
import { addPrototypePetRelationship } from "../../_prototype/businessState";
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
  onSaved: (customer: PrototypeCustomer) => void;
}) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"cat" | "dog">("cat");
  const [businessNote, setBusinessNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    if (!embedded) document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    function handleKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (embedded) return;
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea:not([disabled])")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
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
      window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    };
  }, [embedded, onClose]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = addPrototypePetRelationship({ customerId: customer.id, name, species, businessNote });
    if (!result.ok) {
      setError(result.reason === "invalid" ? "กรอกชื่อน้องก่อนบันทึก" : "บันทึกข้อมูลในเบราว์เซอร์ไม่สำเร็จ ลองอีกครั้ง");
      return;
    }
    onSaved(result.customer);
  }

  return (
    <>
      {embedded ? null : <button className="customer-editor__backdrop" type="button" aria-label="ปิดแบบฟอร์มสัตว์เลี้ยง" onClick={onClose} />}
      <section ref={dialogRef} className={`customer-editor customer-editor--pet${embedded ? " customer-editor--embedded" : ""}`} role="dialog" aria-modal="true" aria-labelledby="pet-relationship-editor-title">
        <header className="customer-editor__header">
          <h2 id="pet-relationship-editor-title">เพิ่มสัตว์เลี้ยง</h2>
          <button ref={closeButtonRef} type="button" aria-label="ปิดแบบฟอร์มสัตว์เลี้ยง" onClick={onClose}><X size={20} /></button>
        </header>
        <form className="customer-editor__form" onSubmit={submit} noValidate>
          <label className="customer-editor__field" htmlFor="customer-pet-name">
            <span>ชื่อ <b aria-hidden="true">*</b><i className="sr-only">จำเป็น</i></span>
            <input id="customer-pet-name" value={name} required onInput={(event) => { setName(event.currentTarget.value); setError(null); }} />
          </label>
          <fieldset className="customer-editor__species">
            <legend>ชนิดสัตว์</legend>
            <div>
              <label><input type="radio" name="customer-pet-species" value="cat" checked={species === "cat"} onChange={() => setSpecies("cat")} />แมว</label>
              <label><input type="radio" name="customer-pet-species" value="dog" checked={species === "dog"} onChange={() => setSpecies("dog")} />สุนัข</label>
            </div>
          </fieldset>
          <label className="customer-editor__field" htmlFor="customer-pet-note">
            <span>หมายเหตุของร้าน <small>ไม่บังคับ</small></span>
            <textarea id="customer-pet-note" value={businessNote} rows={3} onInput={(event) => setBusinessNote(event.currentTarget.value)} />
          </label>
          {error ? <p className="customer-editor__error" role="alert"><CircleAlert size={18} />{error}</p> : null}
          <footer className="customer-editor__actions">
            <button className="button button--business-ghost" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="button button--business" type="submit"><Plus size={18} />เพิ่มสัตว์เลี้ยง</button>
          </footer>
        </form>
      </section>
    </>
  );
}
