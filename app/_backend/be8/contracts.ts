/**
 * BE8 contracts are deliberately kept in the backend/domain layer.  The
 * browser presentation modules have compatible structural types, but the
 * projection code must not import UI or fixture state just to describe a
 * response shape.
 */
export type BusinessServiceModule = "grooming" | "hotel" | "daycare";
export type BookingTimeModel = "appointment" | "date-range" | "day";
export type BookingStatus = "pending" | "confirmed" | "arrived" | "cancelled";
export type BookingResourceKind = "groomer" | "grooming-station" | "dryer" | "hotel-room-type" | "daycare-zone";
export type ChargeStatus = "unpaid" | "partial" | "paid" | "cancelled";
export type ReportDateRangePreset = "today" | "7d" | "30d" | "custom";
export type ReportBranchScope = "current" | "all";

export type ReportOptions = {
  dateRangePreset?: ReportDateRangePreset;
  customStartDate?: string;
  customEndDate?: string;
  branchScope?: ReportBranchScope;
};

export type ReportKeyMetrics = {
  revenue: number;
  paymentCount: number;
  unpaidBalance: number;
  unpaidCount: number;
  partialCount: number;
  completedServices: number;
  completedGrooming: number;
  completedHotel: number;
  completedDaycare: number;
  totalBookings: number;
  confirmedBookings: number;
  arrivedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
};

export type ReportPopularService = {
  label: string;
  module: BusinessServiceModule;
  count: number;
  revenue: number;
};

export type ReportServiceBreakdown = {
  grooming: { revenue: number; jobCount: number; completedCount: number; inProgressCount: number; popularServices: ReportPopularService[] };
  hotel: { revenue: number; stayCount: number; checkInCount: number; checkOutCount: number; occupancyRate: number; capacity: number; occupied: number; available: number };
  daycare: { enabled: boolean; revenue: number; bookingCount: number; attendanceCount: number; activeCount: number; readyForPickupCount: number; completedCount: number; capacity: number; occupied: number; available: number };
};

export type ReportOperationalInsights = {
  busiestDay: { dayName: string; count: number };
  peakAppointmentTime: { timeSlot: string; count: number };
  hotelOccupancyRate: number;
  cancellations: { totalCancelledBookings: number; cancellationRate: number; noShowStays: number; cancelledJobs: number };
  workStatus: { completed: number; pendingOrInProgress: number; delayedOrAttention: number };
};

export type ReportTopCustomer = { customerId: string; customerName: string; petNames: string[]; visitCount: number; totalSpent: number };
export type ReportRecentServiceItem = {
  id: string;
  date: string;
  time: string;
  customerName: string;
  petName: string;
  serviceLabel: string;
  module: BusinessServiceModule;
  branchId: string;
  branchName: string;
  statusLabel: string;
  statusCode: string;
  amount: number;
  paymentStatus: ChargeStatus | "no-charge";
};
export type ReportBranchComparisonItem = { branchId: string; branchName: string; bookingCount: number; completedCount: number; revenue: number; enabledModules: readonly BusinessServiceModule[] };

export type BusinessReportsSummary = {
  dateRange: { preset: ReportDateRangePreset; startDate: string; endDate: string };
  branchScope: ReportBranchScope;
  branchName: string;
  businessName: string;
  keyMetrics: ReportKeyMetrics;
  serviceBreakdown: ReportServiceBreakdown;
  operationalInsights: ReportOperationalInsights;
  customerInsights: { newCustomers: number; returningCustomers: number; topCustomers: ReportTopCustomer[]; recentServices: ReportRecentServiceItem[] };
  branchComparison: ReportBranchComparisonItem[];
};

export type ReportView = BusinessReportsSummary & {
  generatedAt: string;
  waitingIntake: number;
  financials: { grossReceived: number; refunded: number; netReceived: number; unallocated: number };
  revenueSummary: RevenueSummary;
};

export type RevenueBreakdown = { module: BusinessServiceModule; revenue: number; paymentCount: number };
export type RevenueSummary = { revenueToday: number; paymentCountToday: number; unpaidBalance: number; unpaidCount: number; partialCount: number; breakdown: RevenueBreakdown[] };

export type BookingPet = { id: string; name: string; species: "cat" | "dog" };
export type CrmBooking = {
  bookingId: string;
  customer: { id: string; name: string };
  pets: BookingPet[];
  businessId: string;
  branchId: string;
  serviceModule: BusinessServiceModule;
  service: { id: string; label: string };
  timeModel: BookingTimeModel;
  start: string;
  end: string | null;
  requiredResources: BookingResourceKind[];
  assignedResources: string[];
  status: BookingStatus;
  estimate: number | null;
  notes: string;
  revision?: number;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
};

export type CustomerLifecycle = "new" | "active" | "regular" | "inactive";
export type CustomerCrmProfile = {
  customerId: string;
  lifecycle: CustomerLifecycle;
  visitCount: number;
  lastVisitAt: string | null;
  nextBooking: CrmBooking | null;
  servicesUsed: BusinessServiceModule[];
  outstandingBalance: number;
  conversationCount: number;
  latestConversationAt: string | null;
  returned: boolean;
  daysSinceLastVisit: number | null;
  signals: string[];
  nextAction: { label: string; detail: string; href: string; kind: "booking" | "message" | "billing" | "prepare" };
};
export type CustomerTimelineKind = "booking" | "service" | "payment" | "message";
export type CustomerTimelineItem = { id: string; kind: CustomerTimelineKind; at: string; title: string; detail: string; href: string; serviceModule: BusinessServiceModule | null };
export type CrmView = { profile: CustomerCrmProfile; upcoming: CrmBooking[]; timeline: CustomerTimelineItem[]; timelineNext: { at: string; id: string } | null };
export type CrmPage = { generatedAt: string; items: CrmView[]; nextAfterId: string | null };
export type Be8Operation = { businessId: string; branchId: string } & (
  | { type: "reports.get"; options: ReportOptions }
  | { type: "crm.list"; afterId?: string; limit?: number }
  | { type: "crm.get"; customerId: string; before?: { at: string; id: string } }
);
