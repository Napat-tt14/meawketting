import type { RefCallback } from "react";
import type { PrototypeConversation } from "../../_prototype/inboxState";
import { BusinessCustomerAvatar, BusinessPetAvatar } from "../_components/BusinessIdentityAvatar";
import { BusinessSearchField } from "../_components/BusinessSearchField";
import { BusinessSegmentedControl } from "../_components/BusinessSegmentedControl";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import {
  latestPrototypeConversationMessage,
  prototypeMessagePreview,
  prototypeMessageTimeLabel,
  type ResolvedConversationContext,
} from "./inboxPresentation";

export type InboxFilter = "all" | "unread" | "in-service";

export const INBOX_FILTERS: readonly { value: InboxFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "unread", label: "ยังไม่ได้อ่าน" },
  { value: "in-service", label: "กำลังใช้บริการ" },
];

export type InboxConversationListItem = {
  conversation: PrototypeConversation;
  context: ResolvedConversationContext;
};

export function ConversationList({
  items,
  totalCount,
  query,
  filter,
  selectedConversationId,
  onQueryChange,
  onFilterChange,
  onSelect,
  registerRow,
}: {
  items: readonly InboxConversationListItem[];
  totalCount: number;
  query: string;
  filter: InboxFilter;
  selectedConversationId: string | null;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: InboxFilter) => void;
  onSelect: (conversationId: string) => void;
  registerRow: (conversationId: string) => RefCallback<HTMLButtonElement>;
}) {
  return (
    <section className="inbox-list-pane" aria-label="รายการบทสนทนา">
      <div className="inbox-list-tools">
        <BusinessSearchField
          id="inbox-search"
          label="ค้นหาบทสนทนา"
          value={query}
          autoComplete="off"
          placeholder="ค้นหาลูกค้า น้อง หรือข้อความ"
          onInput={(event) => onQueryChange(event.currentTarget.value)}
        />
        <BusinessSegmentedControl
          className="inbox-filter-group"
          value={filter}
          options={INBOX_FILTERS}
          ariaLabel="กรองบทสนทนา"
          onChange={onFilterChange}
        />
      </div>

      <div className="inbox-list-summary" aria-live="polite">
        <strong>{items.length} บทสนทนา</strong>
        {items.length !== totalCount ? <span>จากทั้งหมด {totalCount}</span> : null}
      </div>

      {items.length > 0 ? (
        <ol className="conversation-list">
          {items.map(({ conversation, context }) => {
            const latestMessage = latestPrototypeConversationMessage(conversation);
            const preview = prototypeMessagePreview(latestMessage);
            const identityLabel = [context.customer?.name, context.pet?.name].filter(Boolean).join(" · ") || "บทสนทนา";
            const unreadLabel = conversation.unreadCount > 0 ? `ข้อความใหม่ ${conversation.unreadCount} ข้อความ` : "อ่านแล้ว";
            return (
              <li key={conversation.conversationId}>
                <button
                  ref={registerRow(conversation.conversationId)}
                  className={`conversation-row${selectedConversationId === conversation.conversationId ? " is-selected" : ""}${conversation.unreadCount > 0 ? " is-unread" : ""}`}
                  type="button"
                  aria-current={selectedConversationId === conversation.conversationId ? "true" : undefined}
                  aria-label={`${identityLabel} ${preview} ${unreadLabel}`}
                  onClick={() => onSelect(conversation.conversationId)}
                >
                  <span className="conversation-row__avatar">
                    {context.pet
                      ? <BusinessPetAvatar pet={context.pet} size="large" />
                      : <BusinessCustomerAvatar name={context.customer?.name ?? "ลูกค้า"} size="large" />}
                    {conversation.unreadCount > 0 ? <span className="conversation-row__unread-dot" aria-hidden="true" /> : null}
                  </span>
                  <span className="conversation-row__content">
                    <span className="conversation-row__heading">
                      <strong>{context.customer?.name ?? "ลูกค้า"}{context.pet ? ` · ${context.pet.name}` : ""}</strong>
                      <time dateTime={latestMessage?.sentAt ?? conversation.updatedAt}>{prototypeMessageTimeLabel(latestMessage?.sentAt ?? conversation.updatedAt)}</time>
                    </span>
                    {context.booking ? (
                      <span className="conversation-row__context">
                        <BusinessServiceIcon module={context.booking.serviceModule} size={16} />
                        {context.booking.serviceLabel}
                      </span>
                    ) : null}
                    <span className="conversation-row__preview">{preview}</span>
                  </span>
                  {conversation.unreadCount > 0 ? (
                    <span className="conversation-row__unread" aria-label={`ข้อความใหม่ ${conversation.unreadCount} ข้อความ`}>
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="inbox-list-empty" role="status">
          <strong>ไม่พบบทสนทนาที่ตรงกัน</strong>
          <button type="button" onClick={() => { onQueryChange(""); onFilterChange("all"); }}>ล้างการค้นหา</button>
        </div>
      )}
    </section>
  );
}
