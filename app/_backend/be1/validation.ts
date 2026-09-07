import {
  BE1_SERVICE_MODULES,
  BE1_WEEKDAYS,
  type Be1ApiOperation,
  type Be1ServiceModule,
  type Be1Weekday,
  type BranchConfigurationInput,
  type OperatingHoursView,
  type UpdateBusinessProfileInput,
} from "./contracts";
import { be1Error } from "./errors";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{2,127}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw be1Error("INVALID_INPUT");
  return value as Record<string, unknown>;
}

export function validateId(value: unknown) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw be1Error("INVALID_INPUT");
  return value;
}

function stringField(value: unknown, maximum: number, required = false) {
  if (typeof value !== "string") throw be1Error("INVALID_INPUT");
  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > maximum) throw be1Error("INVALID_INPUT");
  return normalized;
}

function emailField(value: unknown) {
  const email = stringField(value, 254);
  if (email && !EMAIL_PATTERN.test(email)) throw be1Error("INVALID_INPUT");
  return email.toLocaleLowerCase("en-US");
}

function timezoneField(value: unknown) {
  const timezone = stringField(value, 64, true);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
  } catch {
    throw be1Error("INVALID_INPUT");
  }
  return timezone;
}

export function normalizeBranchNameKey(name: string) {
  return name.normalize("NFKC").trim().toLocaleLowerCase("th-TH").replace(/\s+/g, " ");
}

export function validateOperatingHours(value: unknown): OperatingHoursView[] {
  if (!Array.isArray(value) || value.length !== BE1_WEEKDAYS.length) throw be1Error("INVALID_INPUT");
  const entries = new Map<Be1Weekday, OperatingHoursView>();
  for (const raw of value) {
    const candidate = record(raw);
    const day = candidate.day;
    if (typeof day !== "string" || !BE1_WEEKDAYS.includes(day as Be1Weekday) || entries.has(day as Be1Weekday)) {
      throw be1Error("INVALID_INPUT");
    }
    if (typeof candidate.closed !== "boolean" || typeof candidate.open !== "string" || typeof candidate.close !== "string") {
      throw be1Error("INVALID_INPUT");
    }
    if (!TIME_PATTERN.test(candidate.open) || !TIME_PATTERN.test(candidate.close) || (!candidate.closed && candidate.open >= candidate.close)) {
      throw be1Error("INVALID_INPUT");
    }
    entries.set(day as Be1Weekday, {
      day: day as Be1Weekday,
      closed: candidate.closed,
      open: candidate.open,
      close: candidate.close,
    });
  }
  return BE1_WEEKDAYS.map((day) => entries.get(day)!);
}

export function validateEnabledModules(value: unknown): Be1ServiceModule[] {
  if (!Array.isArray(value) || value.length > BE1_SERVICE_MODULES.length) throw be1Error("INVALID_INPUT");
  const modules = value.map((module) => {
    if (typeof module !== "string" || !BE1_SERVICE_MODULES.includes(module as Be1ServiceModule)) throw be1Error("INVALID_INPUT");
    return module as Be1ServiceModule;
  });
  if (new Set(modules).size !== modules.length) throw be1Error("INVALID_INPUT");
  return BE1_SERVICE_MODULES.filter((module) => modules.includes(module));
}

export function validateBusinessProfileInput(value: unknown): UpdateBusinessProfileInput {
  const input = record(value);
  return {
    businessId: validateId(input.businessId),
    name: stringField(input.name, 160, true),
    contactName: stringField(input.contactName, 120),
    phone: stringField(input.phone, 40),
    email: emailField(input.email),
    description: stringField(input.description, 2_000),
    address: stringField(input.address, 1_000),
  };
}

export function validateBranchConfigurationInput(value: unknown, requireBranchId = false): BranchConfigurationInput {
  const input = record(value);
  const branchId = input.branchId === undefined && !requireBranchId ? undefined : validateId(input.branchId);
  return {
    businessId: validateId(input.businessId),
    ...(branchId ? { branchId } : {}),
    name: stringField(input.name, 160, true),
    area: stringField(input.area, 160),
    address: stringField(input.address, 1_000),
    phone: stringField(input.phone, 40),
    email: emailField(input.email),
    timezone: timezoneField(input.timezone),
    enabledModules: validateEnabledModules(input.enabledModules),
    operatingHours: validateOperatingHours(input.operatingHours),
  };
}

export function parseBe1Operation(value: unknown): Be1ApiOperation {
  const operation = record(value);
  if (typeof operation.type !== "string") throw be1Error("INVALID_INPUT");
  switch (operation.type) {
    case "session.resolve":
      return { type: operation.type };
    case "membership.resolve":
    case "business.get":
      return { type: operation.type, businessId: validateId(operation.businessId) };
    case "business.update":
      return { type: operation.type, input: validateBusinessProfileInput(operation.input) };
    case "branch.list":
      if (operation.includeInactive !== undefined && typeof operation.includeInactive !== "boolean") throw be1Error("INVALID_INPUT");
      return { type: operation.type, businessId: validateId(operation.businessId), includeInactive: operation.includeInactive as boolean | undefined };
    case "branch.get":
      return { type: operation.type, businessId: validateId(operation.businessId), branchId: validateId(operation.branchId) };
    case "branch.create":
      return { type: operation.type, input: validateBranchConfigurationInput(operation.input) };
    case "branch.update":
      return { type: operation.type, input: validateBranchConfigurationInput(operation.input, true) as BranchConfigurationInput & { branchId: string } };
    case "branch.set-active":
      if (typeof operation.active !== "boolean") throw be1Error("INVALID_INPUT");
      return { type: operation.type, businessId: validateId(operation.businessId), branchId: validateId(operation.branchId), active: operation.active };
    case "branch.update-hours":
      return { type: operation.type, businessId: validateId(operation.businessId), branchId: validateId(operation.branchId), operatingHours: validateOperatingHours(operation.operatingHours) };
    case "branch.update-modules":
      return { type: operation.type, businessId: validateId(operation.businessId), branchId: validateId(operation.branchId), enabledModules: validateEnabledModules(operation.enabledModules) };
    default:
      throw be1Error("INVALID_INPUT");
  }
}
