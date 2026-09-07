import { be1Error } from "../be1/errors";
import { validateId } from "../be1/validation";
import type {
  Be2ApiOperation,
  CreateCustomerInput,
  CreatePetInput,
  CustomerListInput,
  CustomerPetRelationshipInput,
  CustomerSearchInput,
  PetSpecies,
  UpdateCustomerInput,
  UpdateCustomerNotesInput,
  UpdateCustomerTagsInput,
  UpdatePetInput,
} from "./contracts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw be1Error("INVALID_INPUT");
  return value as Record<string, unknown>;
}

function stringField(value: unknown, maximum: number, required = false) {
  if (typeof value !== "string") throw be1Error("INVALID_INPUT");
  const normalized = value.normalize("NFKC").trim();
  if ((required && !normalized) || normalized.length > maximum) throw be1Error("INVALID_INPUT");
  return normalized;
}

function nullableString(value: unknown, maximum: number) {
  if (value === null || value === undefined || value === "") return null;
  return stringField(value, maximum, true);
}

function emailField(value: unknown) {
  const email = nullableString(value, 254);
  if (email && !EMAIL_PATTERN.test(email)) throw be1Error("INVALID_INPUT");
  return email?.toLocaleLowerCase("en-US") ?? null;
}

function booleanField(value: unknown, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw be1Error("INVALID_INPUT");
  return value;
}

function integerField(value: unknown, fallback: number, minimum: number, maximum: number) {
  const candidate = value === undefined ? fallback : value;
  if (!Number.isInteger(candidate) || typeof candidate !== "number" || candidate < minimum || candidate > maximum) {
    throw be1Error("INVALID_INPUT");
  }
  return candidate;
}

function speciesField(value: unknown): PetSpecies {
  if (value !== "cat" && value !== "dog") throw be1Error("INVALID_INPUT");
  return value;
}

export function normalizeCustomerSearchKey(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("th-TH").replace(/\s+/g, " ");
}

export function normalizePhoneKey(value: string | null | undefined) {
  const digits = (value ?? "").replace(/[^0-9]/g, "");
  return digits || null;
}

export function normalizeTags(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 8) throw be1Error("INVALID_INPUT");
  const tags: string[] = [];
  const keys = new Set<string>();
  for (const raw of value) {
    const label = stringField(raw, 32, true);
    const key = normalizeCustomerSearchKey(label);
    if (!keys.has(key)) {
      keys.add(key);
      tags.push(label);
    }
  }
  return tags;
}

export function validateCustomerListInput(value: unknown): Required<CustomerListInput> {
  const input = record(value);
  return {
    businessId: validateId(input.businessId),
    includeInactive: booleanField(input.includeInactive),
    limit: integerField(input.limit, 50, 1, 100),
    offset: integerField(input.offset, 0, 0, 1_000_000),
  };
}

export function validateCustomerSearchInput(value: unknown): Required<CustomerSearchInput> {
  const input = record(value);
  return {
    ...validateCustomerListInput(input),
    query: stringField(input.query, 120, true),
  };
}

export function validateCreateCustomerInput(value: unknown): Required<CreateCustomerInput> {
  const input = record(value);
  return {
    businessId: validateId(input.businessId),
    displayName: stringField(input.displayName, 120, true),
    phone: nullableString(input.phone, 40),
    email: emailField(input.email),
    businessNotes: stringField(input.businessNotes, 4_000),
    tags: normalizeTags(input.tags),
    allowPotentialDuplicate: booleanField(input.allowPotentialDuplicate),
  };
}

export function validateUpdateCustomerInput(value: unknown): UpdateCustomerInput {
  const input = record(value);
  const base = validateCreateCustomerInput({ ...input, tags: [], allowPotentialDuplicate: false });
  return {
    businessId: base.businessId,
    customerId: validateId(input.customerId),
    displayName: base.displayName,
    phone: base.phone,
    email: base.email,
    businessNotes: base.businessNotes,
  };
}

export function validateUpdateCustomerNotesInput(value: unknown): UpdateCustomerNotesInput {
  const input = record(value);
  return {
    businessId: validateId(input.businessId),
    customerId: validateId(input.customerId),
    businessNotes: stringField(input.businessNotes, 4_000),
  };
}

export function validateUpdateCustomerTagsInput(value: unknown): UpdateCustomerTagsInput {
  const input = record(value);
  return {
    businessId: validateId(input.businessId),
    customerId: validateId(input.customerId),
    tags: normalizeTags(input.tags),
  };
}

export function validateCreatePetInput(value: unknown): Required<CreatePetInput> {
  const input = record(value);
  return {
    businessId: validateId(input.businessId),
    customerId: validateId(input.customerId),
    name: stringField(input.name, 120, true),
    species: speciesField(input.species),
    businessNotes: stringField(input.businessNotes, 4_000),
    allowPotentialDuplicate: booleanField(input.allowPotentialDuplicate),
  };
}

export function validateUpdatePetInput(value: unknown): UpdatePetInput {
  const input = record(value);
  return {
    businessId: validateId(input.businessId),
    petId: validateId(input.petId),
    name: stringField(input.name, 120, true),
    species: speciesField(input.species),
    businessNotes: stringField(input.businessNotes, 4_000),
  };
}

export function validateCustomerPetRelationshipInput(value: unknown): CustomerPetRelationshipInput {
  const input = record(value);
  return {
    businessId: validateId(input.businessId),
    customerId: validateId(input.customerId),
    petId: validateId(input.petId),
  };
}

export function parseBe2Operation(value: unknown): Be2ApiOperation {
  const operation = record(value);
  if (typeof operation.type !== "string") throw be1Error("INVALID_INPUT");
  switch (operation.type) {
    case "customer.list":
      return { type: operation.type, input: validateCustomerListInput(operation.input) };
    case "customer.search":
      return { type: operation.type, input: validateCustomerSearchInput(operation.input) };
    case "customer.get":
      return { type: operation.type, businessId: validateId(operation.businessId), customerId: validateId(operation.customerId) };
    case "customer.create":
      return { type: operation.type, input: validateCreateCustomerInput(operation.input) };
    case "customer.update":
      return { type: operation.type, input: validateUpdateCustomerInput(operation.input) };
    case "customer.set-active":
      if (typeof operation.active !== "boolean") throw be1Error("INVALID_INPUT");
      return { type: operation.type, businessId: validateId(operation.businessId), customerId: validateId(operation.customerId), active: operation.active };
    case "customer.update-notes":
      return { type: operation.type, input: validateUpdateCustomerNotesInput(operation.input) };
    case "customer.update-tags":
      return { type: operation.type, input: validateUpdateCustomerTagsInput(operation.input) };
    case "pet.get":
      return { type: operation.type, businessId: validateId(operation.businessId), petId: validateId(operation.petId) };
    case "pet.create":
      return { type: operation.type, input: validateCreatePetInput(operation.input) };
    case "pet.update":
      return { type: operation.type, input: validateUpdatePetInput(operation.input) };
    case "pet.set-active":
      if (typeof operation.active !== "boolean") throw be1Error("INVALID_INPUT");
      return { type: operation.type, businessId: validateId(operation.businessId), petId: validateId(operation.petId), active: operation.active };
    case "pet.link-customer":
    case "pet.unlink-customer":
      return { type: operation.type, input: validateCustomerPetRelationshipInput(operation.input) };
    default:
      throw be1Error("INVALID_INPUT");
  }
}
