"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  listPrototypeConversationFixtures,
  listPrototypeConversations,
} from "../../_prototype/inboxState";
import { ensureDurableConversation as ensurePrototypeConversation, ensureDurableInbox, isInboxLoaded, loadDurableConversation, markDurableConversationRead } from "../../_backend/be6/client";
import { MessageCircle } from "../../_components/icons";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { useBusinessContext, useBusinessStateReady } from "../_components/useBusinessContext";
import {
  ConversationList,
  type InboxConversationListItem,
  type InboxFilter,
} from "./ConversationList";
import { ConversationPane } from "./ConversationPane";
import {
  conversationIsInService,
  conversationMatchesPrototypeSearch,
  resolvePrototypeConversationContext,
} from "./inboxPresentation";

export type InboxLaunchRequest = {
  key: string;
  conversationId: string | null;
  customerId: string | null;
  petId: string | null;
  bookingId: string | null;
};

export function BusinessInbox({ launchRequest = null }: { launchRequest?: InboxLaunchRequest | null }) {
  const { context, revision, isContextReady } = useBusinessContext();
  const stateReady = useBusinessStateReady();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(launchRequest?.conversationId ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const handledLaunchRef = useRef<string | null>(launchRequest?.conversationId ? launchRequest.key : null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  void revision;

  const conversations = stateReady
    ? listPrototypeConversations(context)
    : listPrototypeConversationFixtures(context);
  const items = useMemo<InboxConversationListItem[]>(() => conversations.map((conversation) => ({
    conversation,
    context: resolvePrototypeConversationContext(conversation, !stateReady),
  })), [conversations, stateReady]);

  useEffect(() => {
    if (!stateReady || !isContextReady || !launchRequest || handledLaunchRef.current === launchRequest.key) return;
    let cancelled = false;
    if (launchRequest.customerId) {
      void ensurePrototypeConversation({
        businessId: context.businessId,
        branchId: context.branchId,
        customerId: launchRequest.customerId,
        petId: launchRequest.petId,
        bookingId: launchRequest.bookingId,
      }).then((result) => {
      if (cancelled) return;
      handledLaunchRef.current = launchRequest.key;
      if (!result.ok) {
        setNotice("เปิดบทสนทนาจากความสัมพันธ์นี้ไม่ได้ โปรดกลับไปเลือกลูกค้าอีกครั้ง");
        return;
      }
      const params = new URLSearchParams(window.location.search);
      params.set("conversation", result.conversation.conversationId);
      params.delete("customerId");
      params.delete("petId");
      params.delete("bookingId");
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
      setSelectedConversationId(result.conversation.conversationId);
      setNotice(result.reused ? "เปิดบทสนทนาเดิมแล้ว" : "เริ่มบทสนทนาใหม่แล้ว");
      });
    }
    return () => { cancelled = true; };
  }, [context.branchId, context.businessId, isContextReady, launchRequest, stateReady]);

  useEffect(() => {
    if (!stateReady || launchRequest?.customerId || selectedConversationId) return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const frame = window.requestAnimationFrame(() => setSelectedConversationId(conversations[0]?.conversationId ?? null));
    return () => window.cancelAnimationFrame(frame);
  }, [conversations, launchRequest?.customerId, selectedConversationId, stateReady]);

  useEffect(() => {
    if (!stateReady || !isContextReady) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        await ensureDurableInbox(context.businessId, context.branchId, true);
        if (!cancelled && selectedConversationId) {
          await loadDurableConversation(context.businessId, context.branchId, selectedConversationId);
          if (!cancelled) await markDurableConversationRead(selectedConversationId, context.businessId, context.branchId);
        }
        if (!cancelled) setNotice((current) => current === "โหลดข้อความล่าสุดไม่สำเร็จ กรุณาลองอีกครั้ง" ? null : current);
      } catch { if (!cancelled) setNotice("โหลดข้อความล่าสุดไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    };
    void refresh(); const timer = window.setInterval(() => void refresh(), 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [context.businessId, context.branchId, isContextReady, selectedConversationId, stateReady]);

  useEffect(() => {
    if (!selectedConversationId || !isInboxLoaded(context.businessId, context.branchId)) return;
    if (conversations.some((conversation) => conversation.conversationId === selectedConversationId)) return;
    const frame = window.requestAnimationFrame(() => setSelectedConversationId(null));
    return () => window.cancelAnimationFrame(frame);
  }, [context.businessId, context.branchId, conversations, selectedConversationId]);

  const visibleItems = items.filter((item) => (
    conversationMatchesPrototypeSearch(item.conversation, item.context, query)
    && (filter === "all"
      || (filter === "unread" && item.conversation.unreadCount > 0)
      || (filter === "in-service" && conversationIsInService(item.context)))
  ));
  const selectedItem = items.find(({ conversation }) => conversation.conversationId === selectedConversationId) ?? null;
  const unreadCount = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);

  function updateConversationQuery(conversationId: string | null) {
    const params = new URLSearchParams(window.location.search);
    params.delete("customerId");
    params.delete("petId");
    params.delete("bookingId");
    if (conversationId) params.set("conversation", conversationId);
    else params.delete("conversation");
    window.history.replaceState(null, "", `${window.location.pathname}${params.size > 0 ? `?${params.toString()}` : ""}`);
  }

  function selectConversation(conversationId: string) {
    setSelectedConversationId(conversationId);
    setNotice(null);
    updateConversationQuery(conversationId);
  }

  function backToList() {
    const previousId = selectedConversationId;
    setSelectedConversationId(null);
    updateConversationQuery(null);
    if (previousId) window.requestAnimationFrame(() => rowRefs.current.get(previousId)?.focus());
  }

  function registerRow(conversationId: string) {
    return (node: HTMLButtonElement | null) => {
      if (node) rowRefs.current.set(conversationId, node);
      else rowRefs.current.delete(conversationId);
    };
  }

  return (
    <div className={`business-inbox shell${selectedItem ? " has-selection" : ""}`}>
      <BusinessPageHeader
        title="ข้อความ"
        context={unreadCount > 0 ? `${unreadCount} ข้อความใหม่` : "ไม่มีข้อความใหม่"}
      />
      {notice ? <p className="business-inbox__notice" role="status">{notice}</p> : null}
      <div className="inbox-layout">
        <ConversationList
          items={visibleItems}
          totalCount={items.length}
          query={query}
          filter={filter}
          selectedConversationId={selectedConversationId}
          onQueryChange={setQuery}
          onFilterChange={setFilter}
          onSelect={selectConversation}
          registerRow={registerRow}
        />
        {selectedItem ? (
          <ConversationPane
            key={selectedItem.conversation.conversationId}
            conversation={selectedItem.conversation}
            context={selectedItem.context}
            businessId={context.businessId}
            currentBranchId={context.branchId}
            onBack={backToList}
            onStateChange={setNotice}
          />
        ) : (
          <section className="inbox-conversation-placeholder" aria-label="ยังไม่ได้เลือกบทสนทนา">
            <MessageCircle size={32} />
            <strong>เลือกบทสนทนาเพื่อเริ่มงาน</strong>
            <p>ดูข้อความและบริบทการจองได้ในพื้นที่เดียวกัน</p>
          </section>
        )}
      </div>
    </div>
  );
}
