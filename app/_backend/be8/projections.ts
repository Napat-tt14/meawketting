import type { ReportOptions, ReportView } from "./contracts";
import type { CustomerCrmProfile } from "./contracts";
import { addDays, dateInZone } from "../shared/time";

export function reportRange(options: ReportOptions, now: string, timezone: string) {
  const preset = options.dateRangePreset ?? "today", today = dateInZone(now, timezone);
  let startDate = preset === "7d" ? addDays(today, -6) : preset === "30d" ? addDays(today, -29) : today, endDate = today;
  if (preset === "custom") { startDate = options.customStartDate || today; endDate = options.customEndDate || today; if (startDate > endDate) [startDate, endDate] = [endDate, startDate]; }
  return { preset, startDate, endDate };
}

/** Empty loading projection contains no demo financial or relationship records. */
export function emptyReport(options: ReportOptions, now: string, timezone: string, businessName = "", branchName = ""): ReportView {
  return {
    dateRange: reportRange(options, now, timezone), branchScope: options.branchScope ?? "current", businessName, branchName, generatedAt: now, waitingIntake: 0,
    financials: { grossReceived: 0, refunded: 0, netReceived: 0, unallocated: 0 },
    revenueSummary: { revenueToday: 0, paymentCountToday: 0, unpaidBalance: 0, unpaidCount: 0, partialCount: 0, breakdown: [] },
    keyMetrics: { revenue: 0, paymentCount: 0, unpaidBalance: 0, unpaidCount: 0, partialCount: 0, completedServices: 0, completedGrooming: 0, completedHotel: 0, completedDaycare: 0, totalBookings: 0, confirmedBookings: 0, arrivedBookings: 0, pendingBookings: 0, cancelledBookings: 0, totalCustomers: 0, newCustomers: 0, returningCustomers: 0 },
    serviceBreakdown: {
      grooming: { revenue: 0, jobCount: 0, completedCount: 0, inProgressCount: 0, popularServices: [] },
      hotel: { revenue: 0, stayCount: 0, checkInCount: 0, checkOutCount: 0, occupancyRate: 0, capacity: 0, occupied: 0, available: 0 },
      daycare: { enabled: false, revenue: 0, bookingCount: 0, attendanceCount: 0, activeCount: 0, readyForPickupCount: 0, completedCount: 0, capacity: 0, occupied: 0, available: 0 },
    },
    operationalInsights: { busiestDay: { dayName: "—", count: 0 }, peakAppointmentTime: { timeSlot: "—", count: 0 }, hotelOccupancyRate: 0, cancellations: { totalCancelledBookings: 0, cancellationRate: 0, noShowStays: 0, cancelledJobs: 0 }, workStatus: { completed: 0, pendingOrInProgress: 0, delayedOrAttention: 0 } },
    customerInsights: { newCustomers: 0, returningCustomers: 0, topCustomers: [], recentServices: [] }, branchComparison: [],
  };
}

export function emptyCrm(customerId: string): CustomerCrmProfile {
  return { customerId, lifecycle: "new", visitCount: 0, lastVisitAt: null, nextBooking: null, servicesUsed: [], outstandingBalance: 0, conversationCount: 0, latestConversationAt: null, returned: false, daysSinceLastVisit: null, signals: [], nextAction: { label: "เพิ่มการจองแรก", detail: "เริ่มจากบริการที่ลูกค้าต้องการ", href: `/business/calendar?customerId=${encodeURIComponent(customerId)}`, kind: "booking" } };
}
