"use client";

import { useEffect, useRef } from "react";
import {
  cancelPrototypeAddServiceRequest,
  type PrototypeAddServiceRequestMessage,
  type PrototypeConversation,
  type PrototypeInboxMessage,
} from "../../_prototype/inboxState";
import { CheckCircle, CircleOff, Clock, X } from "../../_components/icons";
import {
  prototypeMessageTimeLabel,
  prototypeRequestPriceLabel,
  STRUCTURED_REQUEST_STATUS_LABELS,
  type ResolvedConversationContext,
} from "./inboxPresentation";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Bangkok",
});

function messageDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(date);
}

function messageDateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function startsMessageGroup(message: PrototypeInboxMessage, previous: PrototypeInboxMessage | null) {
  if (!previous || previous.direction !== message.direction || previous.kind !== message.kind) return true;
  const elapsed = new Date(message.sentAt).getTime() - new Date(previous.sentAt).getTime();
  return !Number.isFinite(elapsed) || elapsed > 5 * 60_000;
}

function StructuredRequestCard({
  request,
  businessId,
  onMutation,
}: {
  request: PrototypeAddServiceRequestMessage;
  businessId: string;
  onMutation: (notice: string) => void;
}) {
  const StatusIcon = request.requestStatus === "approved"
    ? CheckCircle
    : request.requestStatus === "declined"
      ? CircleOff
      : request.requestStatus === "cancelled"
        ? X
        : Clock;

  function cancelRequest() {
    const result = cancelPrototypeAddServiceRequest(request.messageId, businessId);
    onMutation(result ? "ยกเลิกคำขอแล้ว" : "ยกเลิกคำขอไม่สำเร็จ ลองอีกครั้ง");
  }

  return (
    <article className={`structured-request-card is-${request.requestStatus}`} aria-label={`คำขอเพิ่มบริการ ${request.serviceName} สถานะ ${STRUCTURED_REQUEST_STATUS_LABELS[request.requestStatus]}`}>
      <header>
        <span>ร้านขอเพิ่มบริการ</span>
        <time dateTime={request.sentAt}>{prototypeMessageTimeLabel(request.sentAt)}</time>
      </header>
      <div className="structured-request-card__service">
        <strong>{request.serviceName}</strong>
        <span>{prototypeRequestPriceLabel(request)}</span>
      </div>
      <p>ใช้เวลาเพิ่มประมาณ {request.additionalMinutes} นาที</p>
      {request.note ? <p className="structured-request-card__note">{request.note}</p> : null}
      <div className="structured-request-card__status" role="status">
        <StatusIcon size={18} />
        <span><small>สถานะ</small><strong>{STRUCTURED_REQUEST_STATUS_LABELS[request.requestStatus]}</strong></span>
      </div>
      {request.requestStatus === "waiting" ? (
        <div className="structured-request-card__waiting-actions">
          <button type="button" onClick={cancelRequest}>ยกเลิกคำขอ</button>
        </div>
      ) : request.responseSource === "guardian-local-preview" ? (
        <small className="structured-request-card__source">เจ้าของตอบแล้ว · บันทึกในอุปกรณ์นี้</small>
      ) : null}
      {request.requestStatus === "approved" ? <small className="structured-request-card__effect">{request.serviceJobId ? "อัปเดตเฉพาะงานบริการ · ไม่เปลี่ยนการจองหรือยอดเรียกเก็บอัตโนมัติ" : "ยังไม่เปลี่ยนการจองหรือยอดเรียกเก็บอัตโนมัติ"}</small> : null}
    </article>
  );
}

export function MessageTimeline({
  conversation,
  context,
  businessId,
  onMutation,
}: {
  conversation: PrototypeConversation;
  context: ResolvedConversationContext;
  businessId: string;
  onMutation: (notice: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      block: "end",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [conversation.messages.length]);

  if (conversation.messages.length === 0) {
    return (
      <div className="message-timeline message-timeline--empty" role="log" aria-live="polite">
        <div><strong>เริ่มบทสนทนาได้เลย</strong><p>ส่งข้อความยืนยัน นัดหมาย หรือขอข้อมูลเพิ่มเติมจากช่องด้านล่าง</p></div>
      </div>
    );
  }

  return (
    <div className="message-timeline" role="log" aria-live="polite" aria-label={`ข้อความกับ ${context.customer?.name ?? "ลูกค้า"}`}>
      <ol>
        {conversation.messages.map((message, index) => {
          const previous = conversation.messages[index - 1] ?? null;
          const showDate = !previous || messageDateKey(previous.sentAt) !== messageDateKey(message.sentAt);
          const showSender = startsMessageGroup(message, previous);
          return (
            <li className={`message-entry message-entry--${message.direction}`} key={message.messageId}>
              {showDate ? <div className="message-date-separator"><span>{messageDateLabel(message.sentAt)}</span></div> : null}
              {showSender ? <span className="message-entry__sender">{message.direction === "business" ? "ร้าน" : context.customer?.name ?? "ลูกค้า"}</span> : null}
              {message.kind === "add-service-request" ? (
                <StructuredRequestCard request={message} businessId={businessId} onMutation={onMutation} />
              ) : (
                <div className="message-bubble">
                  <p>{message.text}</p>
                  <span>
                    <time dateTime={message.sentAt}>{prototypeMessageTimeLabel(message.sentAt)}</time>
                    {message.direction === "business" && message.deliveryState ? (
                      <small>{message.deliveryState === "local-read" ? "อ่านแล้ว" : "ส่งแล้ว"}</small>
                    ) : null}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div ref={endRef} />
    </div>
  );
}
