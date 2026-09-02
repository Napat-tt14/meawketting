import type {
  PrototypeChargeBalance,
  PrototypeChargeStatus,
  PrototypePaymentMethod,
} from "../../_prototype/businessState";

export const BILLING_STATUS_LABELS: Record<PrototypeChargeStatus, string> = {
  unpaid: "ยังไม่ชำระ",
  partial: "ชำระบางส่วน",
  paid: "ชำระแล้ว",
  cancelled: "ยกเลิกยอด",
};

export const PAYMENT_METHOD_LABELS: Record<PrototypePaymentMethod, string> = {
  cash: "เงินสด",
  "bank-transfer": "โอนเงิน",
  other: "อื่น ๆ",
};

export function formatBusinessMoney(amount: number) {
  return `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(amount)))} บาท`;
}

export function formatBusinessSignedMoney(amount: number) {
  const absolute = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(Math.abs(Math.round(amount)));
  return amount < 0 ? `−${absolute} บาท` : `${absolute} บาท`;
}

export function chargeStatusLabel(status: PrototypeChargeStatus) {
  return BILLING_STATUS_LABELS[status];
}

export function paymentMethodLabel(method: PrototypePaymentMethod) {
  return PAYMENT_METHOD_LABELS[method];
}

export function chargeBalanceDescription(balance: PrototypeChargeBalance) {
  if (balance.status === "paid") return `รับชำระแล้ว ${formatBusinessMoney(balance.paid)}`;
  if (balance.status === "partial") return `รับแล้ว ${formatBusinessMoney(balance.paid)} · คงเหลือ ${formatBusinessMoney(balance.remaining)}`;
  if (balance.status === "cancelled") return "ยอดนี้ถูกยกเลิกแล้ว";
  return `คงเหลือ ${formatBusinessMoney(balance.remaining)}`;
}
