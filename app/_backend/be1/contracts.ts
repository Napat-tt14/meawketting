export const BE1_API_PATH = "/api/be1" as const;
export const BE1_DEV_ACTOR_HEADER = "x-meawketting-dev-person-id" as const;
export const BE1_DEV_OWNER_PERSON_ID = "prs_01k47meawketting000000001" as const;

export const BE1_ROLES = ["OWNER", "MANAGER", "STAFF"] as const;
export type Be1Role = (typeof BE1_ROLES)[number];

export const BE1_SERVICE_MODULES = ["grooming", "hotel", "daycare"] as const;
export type Be1ServiceModule = (typeof BE1_SERVICE_MODULES)[number];

export const BE1_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type Be1Weekday = (typeof BE1_WEEKDAYS)[number];

export type Be1LifecycleStatus = "active" | "inactive";

export type PersonView = {
  id: string;
  displayName: string;
  primaryEmail: string | null;
  status: Be1LifecycleStatus;
  createdAt: string;
  updatedAt: string;
};

export type BusinessMembershipView = {
  id: string;
  personId: string;
  businessId: string;
  role: Be1Role;
  status: Be1LifecycleStatus;
  createdAt: string;
  updatedAt: string;
};

export type BusinessView = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  description: string;
  address: string;
  /** Metadata reference only. BE1 does not implement media upload or R2. */
  logoUrl: string | null;
  status: Be1LifecycleStatus;
  createdAt: string;
  updatedAt: string;
};

export type OperatingHoursView = {
  day: Be1Weekday;
  closed: boolean;
  open: string;
  close: string;
};

export type BranchView = {
  id: string;
  businessId: string;
  name: string;
  area: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  status: Be1LifecycleStatus;
  enabledModules: Be1ServiceModule[];
  operatingHours: OperatingHoursView[];
  createdAt: string;
  updatedAt: string;
};

export type BusinessWorkspaceView = {
  membership: BusinessMembershipView;
  business: BusinessView;
  permittedBranches: BranchView[];
};

export type BusinessSessionView = {
  person: PersonView;
  workspaces: BusinessWorkspaceView[];
};

export type UpdateBusinessProfileInput = {
  businessId: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  description: string;
  address: string;
};

export type BranchConfigurationInput = {
  businessId: string;
  branchId?: string;
  name: string;
  area: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  enabledModules: Be1ServiceModule[];
  operatingHours: OperatingHoursView[];
};

export type Be1ApiOperation =
  | { type: "session.resolve" }
  | { type: "membership.resolve"; businessId: string }
  | { type: "business.get"; businessId: string }
  | { type: "business.update"; input: UpdateBusinessProfileInput }
  | { type: "branch.list"; businessId: string; includeInactive?: boolean }
  | { type: "branch.get"; businessId: string; branchId: string }
  | { type: "branch.create"; input: BranchConfigurationInput }
  | { type: "branch.update"; input: BranchConfigurationInput & { branchId: string } }
  | { type: "branch.set-active"; businessId: string; branchId: string; active: boolean }
  | { type: "branch.update-hours"; businessId: string; branchId: string; operatingHours: OperatingHoursView[] }
  | { type: "branch.update-modules"; businessId: string; branchId: string; enabledModules: Be1ServiceModule[] };

export type Be1ApiErrorCode =
  | "AUTHENTICATION_NOT_CONFIGURED"
  | "UNAUTHENTICATED"
  | "PERSON_INACTIVE"
  | "MEMBERSHIP_INACTIVE"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "CONFLICT"
  | "LAST_ACTIVE_BRANCH"
  | "PERSISTENCE_ERROR";

export type Be1ResponseMetadata = {
  requestId: string;
  correlationId: string;
};

export type Be1ApiSuccess<T = unknown> = {
  ok: true;
  data: T;
  meta: Be1ResponseMetadata;
};

export type Be1ApiFailure = {
  ok: false;
  error: {
    code: Be1ApiErrorCode;
    message: string;
  };
  meta: Be1ResponseMetadata;
};

export type Be1ApiResponse<T = unknown> = Be1ApiSuccess<T> | Be1ApiFailure;

export type Be1OperationResult<T extends Be1ApiOperation> =
  T["type"] extends "session.resolve" ? BusinessSessionView
    : T["type"] extends "membership.resolve" ? BusinessMembershipView
      : T["type"] extends "business.get" | "business.update" ? BusinessView
        : T["type"] extends "branch.list" ? BranchView[]
          : T["type"] extends "branch.get" | "branch.create" | "branch.update" | "branch.set-active" | "branch.update-hours" | "branch.update-modules" ? BranchView
            : never;
