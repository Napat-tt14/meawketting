"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendPrototypeTextMessage, type PrototypeConversation } from "../../_prototype/inboxState";
import { ArrowLeft, CalendarDays, MessageCircle, Plus, UserRound } from "../../_components/icons";
import { BusinessCustomerAvatar, BusinessPetAvatar } from "../_components/BusinessIdentityAvatar";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import { AddServiceRequestDialog } from "./AddServiceRequestDialog";
import { MessageComposer } from "./MessageComposer";
import { MessageTimeline } from "./MessageTimeline";
import {
  prototypeConversationContextLabel,
  type ResolvedConversationContext,
} from "./inboxPresentation";

export function ConversationPane({
  conversation,
  context,
  businessId,
  currentBranchId,
  onBack,
  onStateChange,
}: {
  conversation: PrototypeConversation;
  context: ResolvedConversationContext;
  businessId: string;
  currentBranchId: string;
  onBack: () => void;
  onStateChange: (notice: string) => void;
}) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const requestTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const frame = window.requestAnimationFrame(() => headingRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [conversation.conversationId]);

  const closeRequest = useCallback(() => {
    setRequestOpen(false);
    window.requestAnimationFrame(() => requestTriggerRef.current?.focus());
  }, []);

  function handleMutation(nextNotice: string) {
    setNotice(nextNotice);
    onStateChange(nextNotice);
  }

  function send(message: string) {
    const result = sendPrototypeTextMessage(conversation.conversationId, businessId, message);
    if (!result.ok) return false;
    return true;
  }

  const canRequestService = context.booking?.status !== "cancelled" && Boolean(context.booking);
  const bookingInCurrentBranch = context.booking?.branchId === currentBranchId;

  return (
    <section className="inbox-conversation-pane" aria-label={`บทสนทนากับ ${context.customer?.name ?? "ลูกค้า"}`}>
      <header className="conversation-header">
        <button className="conversation-header__back" type="button" aria-label="กลับไปรายการบทสนทนา" onClick={onBack}><ArrowLeft size={20} /></button>
        <div className="conversation-header__identity">
          {context.pet
            ? <BusinessPetAvatar pet={context.pet} size="large" />
            : <BusinessCustomerAvatar name={context.customer?.name ?? "ลูกค้า"} size="large" />}
          <div>
            <h2 ref={headingRef} tabIndex={-1}>{context.pet?.name ?? context.customer?.name ?? "บทสนทนา"}</h2>
            {context.pet && context.customer ? <p>{context.customer.name}</p> : null}
          </div>
        </div>
        <div className="conversation-header__actions">
          <a className="conversation-header__action conversation-header__action--customer" aria-label="ดูลูกค้า" href={`/business/customers/${encodeURIComponent(conversation.customerId)}`}><UserRound size={18} /><span>ดูลูกค้า</span></a>
          {canRequestService ? <button ref={requestTriggerRef} className="conversation-header__action conversation-header__action--request" type="button" aria-label="ขอเพิ่มบริการ" onClick={() => setRequestOpen(true)}><Plus size={18} /><span>ขอเพิ่มบริการ</span></button> : null}
        </div>
      </header>

      <div className="conversation-context-strip">
        {context.booking ? (
          <>
            <BusinessServiceIcon module={context.booking.serviceModule} size={20} />
            <span><strong>{context.booking.serviceLabel}</strong><small>{prototypeConversationContextLabel(context)}</small></span>
            {!bookingInCurrentBranch ? <span className="conversation-context-strip__branch">{context.booking.branchName}</span> : null}
            {bookingInCurrentBranch ? (
              <a aria-label="ดูการจอง" href={`/business/calendar?bookingId=${encodeURIComponent(context.booking.bookingId)}`}><CalendarDays size={17} /><span>ดูการจอง</span></a>
            ) : null}
          </>
        ) : (
          <><MessageCircle size={20} /><span><strong>บทสนทนากับลูกค้า</strong><small>ยังไม่ผูกกับการจอง</small></span></>
        )}
      </div>

      <div className="conversation-notice-slot">
        {notice ? <p className="conversation-notice" role="status">{notice}</p> : null}
      </div>
      <MessageTimeline conversation={conversation} context={context} businessId={businessId} onMutation={handleMutation} />
      <MessageComposer onSend={send} />

      {requestOpen && context.booking ? (
        <AddServiceRequestDialog
          conversationId={conversation.conversationId}
          businessId={businessId}
          booking={context.booking}
          onClose={closeRequest}
          onCreated={() => {
            setRequestOpen(false);
            handleMutation("ส่งคำขอเพิ่มบริการแล้ว · รอเจ้าของตอบ");
            window.requestAnimationFrame(() => requestTriggerRef.current?.focus());
          }}
        />
      ) : null}
    </section>
  );
}
