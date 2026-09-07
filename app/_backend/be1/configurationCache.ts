import type { BranchView, BusinessSessionView, BusinessView } from "./contracts";

let session: BusinessSessionView | null = null;
let revision = 0;
const listeners = new Set<() => void>();

function emit() {
  revision += 1;
  for (const listener of listeners) listener();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("meawketting:business-state"));
  }
}

export function installBusinessSession(next: BusinessSessionView) {
  session = next;
  emit();
}

export function patchCachedBusiness(next: BusinessView) {
  if (!session) return;
  session = {
    ...session,
    workspaces: session.workspaces.map((workspace) => workspace.business.id === next.id
      ? { ...workspace, business: next }
      : workspace),
  };
  emit();
}

export function patchCachedBranch(next: BranchView) {
  if (!session) return;
  session = {
    ...session,
    workspaces: session.workspaces.map((workspace) => workspace.business.id === next.businessId
      ? {
          ...workspace,
          permittedBranches: workspace.permittedBranches.some((branch) => branch.id === next.id)
            ? workspace.permittedBranches.map((branch) => branch.id === next.id ? next : branch)
            : [...workspace.permittedBranches, next],
        }
      : workspace),
  };
  emit();
}

export function hasBusinessSession() {
  return session !== null;
}

export function readBusinessSession() {
  return session;
}

export function readCachedBusiness(businessId: string) {
  return session?.workspaces.find((workspace) => workspace.business.id === businessId)?.business ?? null;
}

export function readCachedBranches(businessId: string) {
  return session?.workspaces.find((workspace) => workspace.business.id === businessId)?.permittedBranches ?? [];
}

export function readCachedMembership(businessId: string) {
  return session?.workspaces.find((workspace) => workspace.business.id === businessId)?.membership ?? null;
}

export function subscribeBusinessConfiguration(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBusinessConfigurationRevision() {
  return revision;
}

export function resetBusinessConfigurationForTests() {
  session = null;
  emit();
}
