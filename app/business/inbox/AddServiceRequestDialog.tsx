"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { createPrototypeAddServiceRequest, type PrototypeAddServiceRequestMessage } from "../../_prototype/inboxState";
import { Clock, Plus, X } from "../../_components/icons";
import type { ConversationBookingContext } from "./inboxPresentation";

export function AddServiceRequestDialog({
  conversationId,
  businessId,
  booking,
  serviceJobId = null,
  onClose,
  onCreated,
}: {
  conversationId: string;
  businessId: string;
  booking: Pick<ConversationBookingContext, "bookingId" | "serviceLabel">;
  serviceJobId?: string | null;
  onClose: () => void;
  onCreated: (request: PrototypeAddServiceRequestMessage) => void;
}) {
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const serviceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => serviceRef.current?.focus());
    function handleKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea:not([disabled])")];
      const first = focusable[0];
      const last = focusable.at(-1);
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
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeys);
    };
  }, [onClose]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = createPrototypeAddServiceRequest({
      conversationId,
      businessId,
      bookingId: booking.bookingId,
      serviceJobId,
      serviceName,
      additionalPrice: Number(price),
      additionalMinutes: Number(minutes),
      note,
    });
    if (!result.ok) {
      setNotice(result.reason === "booking-mismatch"
        ? "การจองนี้ไม่พร้อมรับคำขอเพิ่มบริการจากบริบทปัจจุบัน"
        : "ตรวจชื่อบริการ ราคา และเวลาเพิ่มอีกครั้ง");
      return;
    }
    onCreated(result.message);
  }

  return (
    <>
      <button className="add-service-request__backdrop" type="button" tabIndex={-1} aria-label="ปิดแบบฟอร์มขอเพิ่มบริการ" onClick={onClose} />
      <section ref={dialogRef} className="add-service-request" role="dialog" aria-modal="true" aria-labelledby="add-service-request-title">
        <header>
          <div><small>{booking.serviceLabel}</small><h2 id="add-service-request-title">ขออนุมัติเพิ่มบริการ</h2></div>
          <button type="button" aria-label="ปิดแบบฟอร์มขอเพิ่มบริการ" onClick={onClose}><X size={20} /></button>
        </header>
        <form onSubmit={submit}>
          <label>
            <span>บริการเพิ่มเติม</span>
            <input ref={serviceRef} value={serviceName} maxLength={80} placeholder="เช่น แกะสางขน" onInput={(event) => setServiceName(event.currentTarget.value)} required />
          </label>
          <div className="add-service-request__numbers">
            <label>
              <span>ราคาเพิ่ม</span>
              <input type="number" min="0" step="1" inputMode="decimal" value={price} placeholder="300" onInput={(event) => setPrice(event.currentTarget.value)} required />
            </label>
            <label>
              <span>เวลาเพิ่ม (นาที)</span>
              <input type="number" min="0" step="5" inputMode="numeric" value={minutes} onInput={(event) => setMinutes(event.currentTarget.value)} required />
            </label>
          </div>
          <label>
            <span>ข้อความสั้น <small>ไม่บังคับ</small></span>
            <textarea value={note} maxLength={240} rows={3} placeholder="ข้อมูลที่ช่วยให้เจ้าของตัดสินใจ" onInput={(event) => setNote(event.currentTarget.value)} />
          </label>
          <p className="add-service-request__boundary"><Clock size={16} />ส่งแล้วจะอยู่สถานะ “รอเจ้าของตอบ” และยังไม่เปลี่ยนการจองหรือยอดเรียกเก็บ</p>
          {notice ? <p className="add-service-request__notice" role="alert">{notice}</p> : null}
          <footer>
            <button className="button button--business-ghost" type="button" onClick={onClose}>ยกเลิก</button>
            <button className="button button--business" type="submit" disabled={!serviceName.trim() || price === "" || minutes === ""}><Plus size={18} />ส่งคำขอ</button>
          </footer>
        </form>
      </section>
    </>
  );
}
