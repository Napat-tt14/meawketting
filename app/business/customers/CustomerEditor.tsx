"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import type { DemoBusinessContext, PrototypeCustomer } from "../../_prototype/businessState";
import { savePrototypeCustomer } from "../../_prototype/businessState";
import { CircleAlert, Save, X } from "../../_components/icons";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";

export function CustomerEditor({
  context,
  customer,
  embedded = false,
  onClose,
  onSaved,
}: {
  context: DemoBusinessContext;
  customer: PrototypeCustomer | null;
  /** Render inside the booking drawer instead of opening a second viewport modal. */
  embedded?: boolean;
  onClose: () => void;
  onSaved: (customer: PrototypeCustomer, created: boolean) => void;
}) {
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [businessNote, setBusinessNote] = useState(customer?.businessNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<PrototypeCustomer | null>(null);
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
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])")];
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

  function persist(allowPotentialDuplicate: boolean) {
    const result = savePrototypeCustomer({
      customerId: customer?.id,
      businessId: context.businessId,
      name,
      phone,
      email,
      businessNote,
      tags: customer?.tags,
    }, { allowPotentialDuplicate });
    if (!result.ok) {
      if (result.reason === "duplicate") {
        setDuplicate(result.duplicate ?? null);
        setError(null);
        return;
      }
      setDuplicate(null);
      setError(result.reason === "invalid" ? "กรอกชื่อที่ใช้ติดต่อก่อนบันทึก" : "บันทึกข้อมูลในเบราว์เซอร์ไม่สำเร็จ ลองอีกครั้ง");
      return;
    }
    onSaved(result.customer, result.created);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    persist(false);
  }

  return (
    <>
      {embedded ? null : <button className="customer-editor__backdrop" type="button" aria-label="ปิดแบบฟอร์มลูกค้า" onClick={onClose} />}
      <section ref={dialogRef} className={`customer-editor${embedded ? " customer-editor--embedded" : ""}`} role="dialog" aria-modal="true" aria-labelledby="customer-editor-title">
        <header className="customer-editor__header">
          <h2 id="customer-editor-title">{customer ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้า"}</h2>
          <button ref={closeButtonRef} type="button" aria-label="ปิดแบบฟอร์มลูกค้า" onClick={onClose}><X size={20} /></button>
        </header>

        <form className="customer-editor__form" onSubmit={submit} noValidate>
          <label className="customer-editor__field" htmlFor="customer-contact-name">
            <span>ชื่อ <b aria-hidden="true">*</b><i className="sr-only">จำเป็น</i></span>
            <input id="customer-contact-name" value={name} autoComplete="name" required onInput={(event) => { setName(event.currentTarget.value); setError(null); setDuplicate(null); }} />
          </label>
          <label className="customer-editor__field" htmlFor="customer-contact-phone">
            <span>เบอร์โทร</span>
            <input id="customer-contact-phone" value={phone} inputMode="tel" autoComplete="tel" onInput={(event) => { setPhone(event.currentTarget.value); setDuplicate(null); }} />
          </label>
          <label className="customer-editor__field" htmlFor="customer-contact-email">
            <span>อีเมล <small>ไม่บังคับ</small></span>
            <input id="customer-contact-email" value={email} type="email" autoComplete="email" onInput={(event) => setEmail(event.currentTarget.value)} />
          </label>
          <label className="customer-editor__field" htmlFor="customer-business-note">
            <span>หมายเหตุของร้าน <small>ไม่บังคับ</small></span>
            <textarea id="customer-business-note" value={businessNote} rows={3} onInput={(event) => setBusinessNote(event.currentTarget.value)} />
          </label>

          {error ? <p className="customer-editor__error" role="alert"><CircleAlert size={18} />{error}</p> : null}
          {duplicate ? (
            <section className="customer-duplicate-warning" role="alert" aria-labelledby="customer-duplicate-title">
              <CircleAlert size={20} />
              <div>
                <strong id="customer-duplicate-title">อาจมีลูกค้ารายนี้อยู่แล้ว</strong>
                <p>พบเบอร์โทรเดียวกันในข้อมูลของ {duplicate.name}</p>
                <div>
                  <Link href={`/business/customers/${encodeURIComponent(duplicate.id)}`} onClick={onClose}>ดูข้อมูลเดิม</Link>
                  <button type="button" onClick={() => persist(true)}>สร้างต่อ</button>
                </div>
              </div>
            </section>
          ) : null}

          <footer className="customer-editor__actions">
            <button className="button button--business-ghost" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="button button--business" type="submit"><Save size={18} />{customer ? "บันทึกข้อมูล" : "เพิ่มลูกค้า"}</button>
          </footer>
        </form>
      </section>
    </>
  );
}
