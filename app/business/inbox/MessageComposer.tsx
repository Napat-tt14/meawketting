"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Send } from "../../_components/icons";

export const PROTOTYPE_QUICK_REPLIES = [
  "ได้รับข้อมูลแล้วค่ะ",
  "รับน้องเรียบร้อยแล้วค่ะ",
  "กำลังให้บริการอยู่นะคะ",
  "พร้อมรับกลับแล้วค่ะ",
  "รบกวนติดต่อร้านกลับด้วยค่ะ",
] as const;

const DEFAULT_QUICK_REPLY_COUNT = 3;
const QUICK_REPLIES_VISIBILITY_COOKIE = "meawketting_business_inbox_quick_replies";
const QUICK_REPLIES_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readQuickRepliesVisibilityPreference() {
  const preference = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${QUICK_REPLIES_VISIBILITY_COOKIE}=`))
    ?.split("=")[1];
  return preference === "hidden" ? false : true;
}

function writeQuickRepliesVisibilityPreference(visible: boolean) {
  document.cookie = `${QUICK_REPLIES_VISIBILITY_COOKIE}=${visible ? "shown" : "hidden"}; Max-Age=${QUICK_REPLIES_COOKIE_MAX_AGE}; Path=/business; SameSite=Lax`;
}

export function MessageComposer({
  disabled = false,
  onSend,
}: {
  disabled?: boolean;
  onSend: (message: string) => Promise<boolean>;
}) {
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(true);
  const [showAllQuickReplies, setShowAllQuickReplies] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setQuickRepliesOpen(readQuickRepliesVisibilityPreference());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const text = message.trim();
    if (!text || disabled || sendingRef.current) return;
    sendingRef.current = true;
    const sent = await onSend(text).catch(() => false); sendingRef.current = false;
    if (!sent) {
      setNotice("ส่งข้อความไม่สำเร็จ ลองอีกครั้ง");
      return;
    }
    setMessage((current) => current.trim() === text ? "" : current);
    setNotice(null);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  }

  function chooseQuickReply(reply: string) {
    setMessage(reply);
    setNotice(null);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function toggleQuickReplies() {
    const next = !quickRepliesOpen;
    setQuickRepliesOpen(next);
    writeQuickRepliesVisibilityPreference(next);
    if (!next) setShowAllQuickReplies(false);
  }

  const visibleQuickReplies = showAllQuickReplies
    ? PROTOTYPE_QUICK_REPLIES
    : PROTOTYPE_QUICK_REPLIES.slice(0, DEFAULT_QUICK_REPLY_COUNT);

  return (
    <div className="message-composer-wrap">
      <div className={`quick-replies${quickRepliesOpen ? "" : " is-collapsed"}`} aria-label="ข้อความตอบกลับด่วน">
        <button
          className="quick-replies__toggle"
          type="button"
          aria-expanded={quickRepliesOpen}
          aria-controls="business-quick-replies"
          onClick={toggleQuickReplies}
        >
          <span>ตอบกลับด่วน</span><ChevronDown size={17} />
        </button>
        {quickRepliesOpen ? <div className="quick-replies__content" id="business-quick-replies">
          <div className="quick-replies__items">
            {visibleQuickReplies.map((reply) => (
              <button key={reply} type="button" disabled={disabled} onClick={() => chooseQuickReply(reply)}>{reply}</button>
            ))}
          </div>
          {PROTOTYPE_QUICK_REPLIES.length > DEFAULT_QUICK_REPLY_COUNT ? (
            <button
              className="quick-replies__more"
              type="button"
              aria-expanded={showAllQuickReplies}
              aria-label={showAllQuickReplies ? "ซ่อนข้อความตอบกลับด่วนเพิ่มเติม" : "แสดงข้อความตอบกลับด่วนเพิ่มเติม"}
              onClick={() => setShowAllQuickReplies((current) => !current)}
            >
              <Plus size={17} />
            </button>
          ) : null}
        </div> : null}
      </div>
      <form className="message-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="business-message-composer">พิมพ์ข้อความถึงลูกค้า</label>
        <textarea
          ref={inputRef}
          id="business-message-composer"
          value={message}
          rows={1}
          maxLength={1000}
          disabled={disabled}
          placeholder="พิมพ์ข้อความ..."
          aria-describedby="business-message-composer-boundary"
          onInput={(event) => { setMessage(event.currentTarget.value); setNotice(null); }}
          onKeyDown={handleKeyDown}
        />
        <button className="button button--business" type="submit" aria-label="ส่งข้อความ" disabled={disabled || !message.trim()}>
          <Send size={18} /><span>ส่ง</span>
        </button>
      </form>
      <div className="message-composer__meta">
        <small id="business-message-composer-boundary">Enter เพื่อส่ง · Shift+Enter เพื่อขึ้นบรรทัดใหม่</small>
        <span role="status" aria-live="polite">{notice}</span>
      </div>
    </div>
  );
}
