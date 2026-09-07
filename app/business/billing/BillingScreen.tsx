"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  BILLING_DEMO_NOW,
  BOOKING_DEMO_DATE,
  addPrototypeChargeAdjustment,
  cancelPrototypeCharge,
  getOrCreatePrototypeChargeForGroomingJob,
  getOrCreatePrototypeChargeForDaycareAttendance,
  getOrCreatePrototypeChargeForHotelStay,
  getPrototypeRevenueSummary,
  listPrototypeChargeBalances,
  listPrototypePaymentFixtures,
  listPrototypePayments,
  recordPrototypePayment,
  readPrototypeCustomer,
  type PrototypeChargeBalance,
  type PrototypeChargeStatus,
  type PrototypePaymentMethod,
} from "../../_prototype/businessState";
import { ensurePrototypeConversation, sendPrototypeTextMessage } from "../../_prototype/inboxState";
import {
  CheckCircle,
  CircleAlert,
  CircleDashed,
  CircleOff,
  Clock,
  MessageCircle,
  Plus,
  Wallet,
} from "../../_components/icons";
import { BusinessAlert } from "../_components/BusinessFeedback";
import { BusinessDataTable } from "../_components/BusinessDataTable";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";
import { BusinessModal } from "../_components/BusinessModal";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { BusinessSegmentedControl } from "../_components/BusinessSegmentedControl";
import { useBusinessContext, useBusinessStateReady } from "../_components/useBusinessContext";
import {
  PAYMENT_METHOD_LABELS,
  chargeBalanceDescription,
  chargeStatusLabel,
  formatBusinessMoney,
  formatBusinessSignedMoney,
  paymentMethodLabel,
} from "./billingPresentation";

export type BillingLaunchRequest = {
  key: string;
  chargeId: string | null;
  serviceJobId: string | null;
  hotelStayId: string | null;
  daycareAttendanceId: string | null;
};

type BillingFilter = "all" | PrototypeChargeStatus;
type BillingModalMode = "review" | "payment" | "adjustment" | "cancel";

const FILTER_OPTIONS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "unpaid", label: "ยังไม่ชำระ" },
  { value: "partial", label: "บางส่วน" },
  { value: "paid", label: "ชำระแล้ว" },
  { value: "cancelled", label: "ยกเลิก" },
] as const;

const STATUS_ICON = {
  unpaid: Clock,
  partial: CircleDashed,
  paid: CheckCircle,
  cancelled: CircleOff,
} as const;

function localPaymentKey(chargeId: string) {
  return `billing-${chargeId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function chargeCustomer(balance: PrototypeChargeBalance) {
  const customer = readPrototypeCustomer(balance.charge.customerId);
  const pet = balance.charge.petId ? customer?.pets.find((item) => item.id === balance.charge.petId) ?? null : null;
  return {
    customer,
    petLabel: pet?.name ?? (balance.charge.petId ? "น้อง" : "หลายตัวตามการจอง"),
  };
}

function sourceHref(balance: PrototypeChargeBalance) {
  if (balance.charge.serviceJobId) return `/business/grooming?jobId=${encodeURIComponent(balance.charge.serviceJobId)}`;
  if (balance.charge.hotelStayId) return `/business/hotel?stayId=${encodeURIComponent(balance.charge.hotelStayId)}`;
  if (balance.charge.daycareAttendanceId) return `/business/daycare?attendanceId=${encodeURIComponent(balance.charge.daycareAttendanceId)}`;
  return `/business/calendar?bookingId=${encodeURIComponent(balance.charge.bookingId)}`;
}

function StatusPill({ status }: { status: PrototypeChargeStatus }) {
  const Icon = STATUS_ICON[status];
  return <span className={`billing-status billing-status--${status}`}><Icon size={16} /><span>{chargeStatusLabel(status)}</span></span>;
}

function ChargeFacts({ balance }: { balance: PrototypeChargeBalance }) {
  const { customer, petLabel } = chargeCustomer(balance);
  return (
    <div className="billing-charge-facts">
      <span><strong>{customer?.name ?? "ลูกค้า"}</strong><small>{petLabel} · {balance.charge.serviceLabel}</small></span>
      <Link href={sourceHref(balance)}>ดูงานต้นทาง</Link>
    </div>
  );
}

function ChargeCard({ balance, onOpen }: { balance: PrototypeChargeBalance; onOpen: () => void }) {
  const { customer, petLabel } = chargeCustomer(balance);
  const reviewLabel = `ตรวจรายการ ${customer?.name ?? "ลูกค้า"} · ${petLabel} · ${balance.charge.serviceLabel}`;
  return (
    <article className="billing-charge-card">
      <button className="billing-charge-card__review" type="button" onClick={onOpen} aria-label={reviewLabel}>
        <span className="billing-charge-card__top"><span className="billing-charge-facts"><span><strong>{customer?.name ?? "ลูกค้า"}</strong><small>{petLabel} · {balance.charge.serviceLabel}</small></span></span><StatusPill status={balance.status} /></span>
        <span className="billing-charge-card__amounts"><span><small>ยอดรวม</small><strong>{formatBusinessMoney(balance.total)}</strong></span><span><small>คงเหลือ</small><strong>{formatBusinessMoney(balance.remaining)}</strong></span></span>
        <span className="billing-charge-card__description">{chargeBalanceDescription(balance)}</span>
      </button>
      <Link className="billing-charge-card__source" href={sourceHref(balance)}>ดูงานต้นทาง</Link>
    </article>
  );
}

export function BillingScreen({ launchRequest = null }: { launchRequest?: BillingLaunchRequest | null }) {
  const { context, revision, isContextReady } = useBusinessContext();
  const stateReady = useBusinessStateReady();
  const [filter, setFilter] = useState<BillingFilter>("all");
  const [selectedChargeId, setSelectedChargeId] = useState<string | null>(null);
  const [mode, setMode] = useState<BillingModalMode>("review");
  const [notice, setNotice] = useState<{ tone: "success" | "warning" | "critical" | "info"; title: string; detail?: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PrototypePaymentMethod>("cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentKey, setPaymentKey] = useState("");
  const [adjustmentKind, setAdjustmentKind] = useState<"manual-adjustment" | "discount">("manual-adjustment");
  const [adjustmentLabel, setAdjustmentLabel] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const handledLaunchRef = useRef<string | null>(null);
  void revision;

  const billingReady = stateReady && isContextReady;
  const balances = listPrototypeChargeBalances(context, !billingReady);
  const revenue = getPrototypeRevenueSummary(context, BOOKING_DEMO_DATE, !billingReady);
  const payments = billingReady ? listPrototypePayments(context) : listPrototypePaymentFixtures(context);
  const selected = balances.find((item) => item.charge.chargeId === selectedChargeId) ?? null;
  const visibleBalances = balances.filter((balance) => filter === "all" || balance.status === filter);

  useEffect(() => {
    if (!billingReady || !launchRequest || handledLaunchRef.current === launchRequest.key) return;
    const timer = window.setTimeout(() => {
      if (handledLaunchRef.current === launchRequest.key) return;
      handledLaunchRef.current = launchRequest.key;
      const result = launchRequest.serviceJobId
        ? getOrCreatePrototypeChargeForGroomingJob(launchRequest.serviceJobId, context)
        : launchRequest.hotelStayId
          ? getOrCreatePrototypeChargeForHotelStay(launchRequest.hotelStayId, context)
          : launchRequest.daycareAttendanceId
            ? getOrCreatePrototypeChargeForDaycareAttendance(launchRequest.daycareAttendanceId, context)
            : null;
      if (result?.ok) {
        setSelectedChargeId(result.charge.chargeId);
        setMode("review");
        setNotice({
          tone: "success",
          title: result.created ? "สร้างยอดสำหรับตรวจรายการแล้ว" : "เปิดยอดที่มีอยู่แล้ว",
          detail: result.reconciled ? "เพิ่มบริการเพิ่มเติมที่อนุมัติแล้วเข้าในยอดนี้" : "ยอดและการชำระแยกจากสถานะงานบริการ",
        });
        return;
      }
      if (result && !result.ok) {
        setNotice({ tone: "critical", title: "เปิด Checkout ไม่ได้", detail: result.reason === "wrong-context" ? "งานนี้ไม่ได้อยู่ในสาขาปัจจุบัน" : result.reason === "invalid-amount" ? "ยอดบริการต้องเป็นจำนวนเต็มบาทก่อน Checkout" : "ไม่พบรายการบริการที่พร้อมสร้างยอด" });
        return;
      }
      if (launchRequest.chargeId && balances.some((balance) => balance.charge.chargeId === launchRequest.chargeId)) {
        setSelectedChargeId(launchRequest.chargeId);
        setMode("review");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [balances, billingReady, context, launchRequest]);

  function openCharge(balance: PrototypeChargeBalance) {
    setSelectedChargeId(balance.charge.chargeId);
    setMode("review");
    setNotice(null);
  }

  function closeModal() {
    setSelectedChargeId(null);
    setMode("review");
  }

  function beginPayment() {
    if (!selected) return;
    setPaymentAmount(String(selected.remaining));
    setPaymentMethod("cash");
    setPaymentNote("");
    setPaymentKey(localPaymentKey(selected.charge.chargeId));
    setMode("payment");
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const result = recordPrototypePayment({
      chargeId: selected.charge.chargeId,
      context,
      amount: Number(paymentAmount),
      method: paymentMethod,
      note: paymentNote,
      requestKey: paymentKey,
      recordedAt: BILLING_DEMO_NOW,
    });
    if (!result.ok) {
      const detail = result.reason === "overpayment"
        ? `ยอดที่รับได้สูงสุดคือ ${formatBusinessMoney(selected.remaining)}`
        : result.reason === "cancelled"
          ? "ยอดนี้ถูกยกเลิกแล้ว จึงบันทึกรับชำระไม่ได้"
          : "ตรวจยอดและวิธีชำระเงินก่อนบันทึกอีกครั้ง";
      setNotice({ tone: "critical", title: "บันทึกรับชำระไม่สำเร็จ", detail });
      return;
    }
    setMode("review");
    setNotice({ tone: "success", title: result.duplicate ? "รายการชำระนี้ถูกบันทึกไว้แล้ว" : "บันทึกการรับชำระแล้ว", detail: "สถานะยอดคำนวณจากการจัดสรรเงินชำระในรายการนี้" });
  }

  function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const result = addPrototypeChargeAdjustment({
      chargeId: selected.charge.chargeId,
      context,
      kind: adjustmentKind,
      label: adjustmentLabel,
      amount: Number(adjustmentAmount),
      reason: adjustmentReason,
    });
    if (!result.ok) {
      const detail = result.reason === "invalid-total" ? "ส่วนลดทำให้ยอดรวมติดลบไม่ได้" : "ระบุชื่อรายการ จำนวนเต็มบาท และเหตุผลก่อนบันทึก";
      setNotice({ tone: "critical", title: "ปรับยอดไม่สำเร็จ", detail });
      return;
    }
    setAdjustmentLabel("");
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setMode("review");
    setNotice({ tone: "success", title: "ปรับยอดแล้ว", detail: "บันทึกเหตุผลไว้กับรายการนี้แล้ว" });
  }

  function submitCancellation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const result = cancelPrototypeCharge(selected.charge.chargeId, cancellationReason, context);
    if (!result.ok) {
      const detail = result.reason === "has-payments"
        ? "ยอดที่มีการรับชำระแล้วต้องใช้กระบวนการคืนเงินในอนาคต ไม่ยกเลิกอัตโนมัติ"
        : "ระบุเหตุผลก่อนยกเลิกยอด";
      setNotice({ tone: "critical", title: "ยกเลิกยอดไม่สำเร็จ", detail });
      return;
    }
    setCancellationReason("");
    setMode("review");
    setNotice({ tone: "warning", title: result.duplicate ? "ยอดนี้ถูกยกเลิกไว้แล้ว" : "ยกเลิกยอดแล้ว", detail: "การยกเลิกยอดไม่สร้างการคืนเงินอัตโนมัติ" });
  }

  function sendBillingMessage(balance: PrototypeChargeBalance) {
    const customer = readPrototypeCustomer(balance.charge.customerId);
    if (!customer) {
      setNotice({ tone: "critical", title: "ส่งข้อความไม่ได้", detail: "ไม่พบความสัมพันธ์ลูกค้าสำหรับยอดนี้" });
      return;
    }
    const conversation = ensurePrototypeConversation({
      businessId: context.businessId,
      branchId: context.branchId,
      customerId: customer.id,
      petId: balance.charge.petId,
      bookingId: balance.charge.bookingId,
      serviceJobId: balance.charge.serviceJobId,
    });
    if (!conversation.ok) {
      setNotice({ tone: "critical", title: "เปิดบริบทข้อความไม่ได้", detail: "ลองกลับไปที่ลูกค้าและเปิด Inbox อีกครั้ง" });
      return;
    }
    const text = balance.status === "cancelled"
      ? `ร้านยกเลิกยอด ${balance.charge.serviceLabel} แล้ว · ไม่มีรายการรับชำระสำหรับยอดนี้`
      : balance.status === "paid"
      ? `ร้านบันทึกการรับชำระ ${formatBusinessMoney(balance.paid)} สำหรับ ${balance.charge.serviceLabel} เรียบร้อยแล้ว`
      : `แจ้งยอด ${balance.charge.serviceLabel} ${formatBusinessMoney(balance.total)} · คงเหลือ ${formatBusinessMoney(balance.remaining)}`;
    const sent = sendPrototypeTextMessage(conversation.conversation.conversationId, context.businessId, text);
    setNotice(sent.ok
      ? { tone: "success", title: "ส่งข้อความใน Inbox แล้ว", detail: "เปิดบทสนทนาใน Inbox เพื่อติดตามกับลูกค้า" }
      : { tone: "critical", title: "ส่งข้อความไม่ได้", detail: "ไม่สามารถบันทึกข้อความได้ กรุณาลองอีกครั้ง" });
  }

  const modalTitle = mode === "payment" ? "รับชำระเงิน" : mode === "adjustment" ? "ปรับยอด" : mode === "cancel" ? "ยกเลิกยอด" : "ตรวจยอดและ Checkout";
  const paymentRecords = selected ? payments.filter((payment) => payment.allocations.some((allocation) => allocation.chargeId === selected.charge.chargeId)) : [];

  return (
    <div className="business-billing shell">
      <BusinessPageHeader
        title="การเงิน"
        context="สาขาปัจจุบัน"
      />

      {notice ? <BusinessAlert tone={notice.tone} title={notice.title} className="business-billing__notice">{notice.detail ? <p>{notice.detail}</p> : null}</BusinessAlert> : null}

      <section className="billing-summary" aria-label="สรุปรายรับและยอดค้างของวันนี้">
        <article className="billing-summary-card billing-summary-card--revenue">
          <header className="billing-summary-card__header">
            <div className="billing-summary-card__title-row">
              <span className="billing-summary-card__icon billing-summary-card__icon--revenue" aria-hidden="true"><Wallet size={18} /></span>
              <span className="billing-summary-card__label">รายรับวันนี้</span>
            </div>
          </header>
          <div className="billing-summary-card__value">{formatBusinessMoney(revenue.revenueToday)}</div>
          <footer className="billing-summary-card__footer"><span>จาก Payment {revenue.paymentCountToday} รายการ</span></footer>
        </article>
        <article className="billing-summary-card billing-summary-card--unpaid">
          <header className="billing-summary-card__header">
            <div className="billing-summary-card__title-row">
              <span className="billing-summary-card__icon billing-summary-card__icon--unpaid" aria-hidden="true"><Clock size={18} /></span>
              <span className="billing-summary-card__label">ยอดค้างชำระ</span>
            </div>
          </header>
          <div className="billing-summary-card__value">{formatBusinessMoney(revenue.unpaidBalance)}</div>
          <footer className="billing-summary-card__footer"><span>ยังไม่ชำระ {revenue.unpaidCount} · บางส่วน {revenue.partialCount}</span></footer>
        </article>
        <article className="billing-summary-card billing-summary-card--breakdown">
          <header className="billing-summary-card__header">
            <div className="billing-summary-card__title-row">
              <span className="billing-summary-card__icon billing-summary-card__icon--breakdown" aria-hidden="true"><CheckCircle size={18} /></span>
              <span className="billing-summary-card__label">ตามบริการ</span>
            </div>
          </header>
          <div className="billing-summary-card__value">{revenue.breakdown.length} <small>กลุ่ม</small></div>
          <footer className="billing-summary-card__footer"><span>{revenue.breakdown.length > 0 ? revenue.breakdown.map((item) => `${item.module === "grooming" ? "อาบน้ำ / ตัดขน" : item.module === "hotel" ? "โรงแรม" : "Daycare"} ${formatBusinessMoney(item.revenue)}`).join(" · ") : "ยังไม่มี Payment วันนี้"}</span></footer>
        </article>
      </section>

      <section className="billing-list-section" aria-labelledby="billing-charges-title">
        <header className="billing-list-section__header">
          <div><span>ยอดที่ต้องชำระ</span><h2 id="billing-charges-title">Charge และสถานะการชำระ</h2><p>การสร้างยอดยังไม่เท่ากับรับชำระเงิน</p></div>
          <div className="billing-list-section__filter">
            <span className="billing-list-section__filter-label">กรองสถานะ</span>
            <BusinessSegmentedControl value={filter} options={FILTER_OPTIONS} ariaLabel="กรองสถานะยอด" onChange={setFilter} className="billing-filter" />
          </div>
        </header>

        {visibleBalances.length > 0 ? (
          <>
            <BusinessDataTable caption="รายการ Charge ของสาขาปัจจุบัน" className="billing-charge-table">
              <thead>
                <tr>
                  <th scope="col">รายการ</th>
                  <th scope="col" style={{ textAlign: "right" }}>ยอดรวม</th>
                  <th scope="col" style={{ textAlign: "right" }}>รับแล้ว</th>
                  <th scope="col" style={{ textAlign: "right" }}>คงเหลือ</th>
                  <th scope="col">สถานะ</th>
                  <th scope="col" style={{ textAlign: "right" }}><span className="sr-only">การทำงาน</span></th>
                </tr>
              </thead>
              <tbody>{visibleBalances.map((balance) => <tr key={balance.charge.chargeId}>
                <td><ChargeFacts balance={balance} /></td>
                <td className="billing-number" style={{ textAlign: "right" }}>{formatBusinessMoney(balance.total)}</td>
                <td className="billing-number" style={{ textAlign: "right" }}>{formatBusinessMoney(balance.paid)}</td>
                <td className="billing-number" style={{ textAlign: "right" }}>{formatBusinessMoney(balance.remaining)}</td>
                <td><StatusPill status={balance.status} /></td>
                <td style={{ textAlign: "right" }}><button className="button button--business-ghost billing-open-charge" type="button" onClick={() => openCharge(balance)}>ตรวจรายการ</button></td>
              </tr>)}</tbody>
            </BusinessDataTable>
            <div className="billing-charge-cards" aria-label="รายการยอดสำหรับหน้าจอขนาดเล็ก">
              {visibleBalances.map((balance) => <ChargeCard key={balance.charge.chargeId} balance={balance} onOpen={() => openCharge(balance)} />)}
            </div>
          </>
        ) : <div className="billing-empty"><CircleAlert size={25} /><p>ไม่พบยอดตามสถานะที่เลือก</p></div>}
      </section>

      {selected ? <BusinessModal
        open
        onClose={closeModal}
        size="large"
        title={modalTitle}
        description="ตรวจรายละเอียดรายการ ยอดคงเหลือ และประวัติการรับชำระเงิน"
        footer={mode === "review" ? <div className="billing-modal-actions">
          <button className="button button--business-ghost" type="button" onClick={() => sendBillingMessage(selected)}><MessageCircle size={17} />ส่งข้อความ</button>
          {selected.status !== "cancelled" ? <button className="button button--business-ghost" type="button" onClick={() => { setAdjustmentKind("manual-adjustment"); setMode("adjustment"); }}><Plus size={17} />ปรับยอด</button> : null}
          {selected.status !== "cancelled" && selected.paid === 0 ? <button className="button button--business-ghost" type="button" onClick={() => setMode("cancel")}>ยกเลิกยอด</button> : null}
          {selected.status !== "paid" && selected.status !== "cancelled" ? <button className="button button--business billing-modal-actions__primary" type="button" onClick={beginPayment}><Wallet size={17} />รับชำระ</button> : null}
        </div> : <button className="button button--business-ghost" type="button" onClick={() => setMode("review")}>กลับไปตรวจยอด</button>}
      >
        {mode === "review" ? <>
          <section className="billing-checkout-overview" aria-labelledby="billing-checkout-overview-title"><div><span>รายการ</span><h3 id="billing-checkout-overview-title">{selected.charge.serviceLabel}</h3><ChargeFacts balance={selected} /></div><StatusPill status={selected.status} /></section>
          <section className="billing-breakdown" aria-labelledby="billing-breakdown-title"><header><h3 id="billing-breakdown-title">รายละเอียด Charge</h3><small>ยอดรวม {formatBusinessMoney(selected.total)}</small></header><ul>{selected.charge.lineItems.map((line) => <li key={line.id}><span><strong>{line.label}</strong>{line.reason ? <small>{line.reason}</small> : null}</span><b className={line.amount < 0 ? "is-discount" : ""}>{formatBusinessSignedMoney(line.amount)}</b></li>)}</ul><dl><div><dt>ยอดรวม</dt><dd>{formatBusinessMoney(selected.total)}</dd></div><div><dt>รับแล้ว</dt><dd>{formatBusinessMoney(selected.paid)}</dd></div><div><dt>คงเหลือ</dt><dd>{formatBusinessMoney(selected.remaining)}</dd></div></dl></section>
          <section className="billing-payment-history" aria-labelledby="billing-payment-history-title"><header><h3 id="billing-payment-history-title">Payment record</h3><small>{selected.paymentCount} รายการ</small></header>{paymentRecords.length > 0 ? <ol>{paymentRecords.map((payment) => <li key={payment.paymentId}><span><strong>{paymentMethodLabel(payment.method)}</strong><small>{payment.note || "ไม่มีหมายเหตุ"} · {payment.recordedAt.slice(11, 16)}</small></span><b>{formatBusinessMoney(payment.amount)}</b></li>)}</ol> : <p>ยังไม่มีการรับชำระสำหรับยอดนี้</p>}</section>
        </> : null}

        {mode === "payment" ? <form className="billing-form" onSubmit={submitPayment}><p>คงเหลือให้รับชำระ {formatBusinessMoney(selected.remaining)}</p><label><span>ยอดที่รับชำระ</span><input inputMode="numeric" min="1" max={selected.remaining} step="1" type="number" value={paymentAmount} onChange={(event) => setPaymentAmount(event.currentTarget.value)} required /></label><label><span>วิธีชำระ</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.currentTarget.value as PrototypePaymentMethod)}>{(Object.entries(PAYMENT_METHOD_LABELS) as [PrototypePaymentMethod, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>หมายเหตุ <small>ไม่บังคับ</small></span><input maxLength={160} value={paymentNote} onChange={(event) => setPaymentNote(event.currentTarget.value)} placeholder="เช่น เลขอ้างอิงการโอน" /></label><button className="button button--business" type="submit"><Wallet size={17} />บันทึกรับชำระ</button></form> : null}

        {mode === "adjustment" ? <form className="billing-form" onSubmit={submitAdjustment}><label><span>ประเภท</span><select value={adjustmentKind} onChange={(event) => setAdjustmentKind(event.currentTarget.value as "manual-adjustment" | "discount")}><option value="manual-adjustment">ปรับเพิ่มยอด</option><option value="discount">ส่วนลด</option></select></label><label><span>ชื่อรายการ</span><input maxLength={80} value={adjustmentLabel} onChange={(event) => setAdjustmentLabel(event.currentTarget.value)} placeholder="เช่น ค่าบริการเพิ่มเติม" required /></label><label><span>จำนวนเต็มบาท</span><input inputMode="numeric" min="1" step="1" type="number" value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.currentTarget.value)} required /></label><label><span>เหตุผล</span><textarea maxLength={240} rows={3} value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.currentTarget.value)} placeholder="บอกเหตุผลของการปรับยอด" required /></label><button className="button button--business" type="submit"><Plus size={17} />บันทึกการปรับยอด</button></form> : null}

        {mode === "cancel" ? <form className="billing-form billing-form--cancel" onSubmit={submitCancellation}><p>ยกเลิกได้เฉพาะรายการที่ยังไม่มีการรับชำระเงิน</p><label><span>เหตุผลที่ยกเลิกยอด</span><textarea maxLength={240} rows={3} value={cancellationReason} onChange={(event) => setCancellationReason(event.currentTarget.value)} placeholder="เช่น ยกเลิกบริการก่อนเริ่ม" required /></label><button className="button button--destructive" type="submit">ยืนยันยกเลิกยอด</button></form> : null}
      </BusinessModal> : null}
    </div>
  );
}
