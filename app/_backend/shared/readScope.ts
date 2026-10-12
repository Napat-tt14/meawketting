export type BusinessReadScope = { personId: string; membershipId: string; role: "OWNER" | "MANAGER" | "STAFF"; membershipUpdatedAt: string; branches: { id: string; updatedAt: string }[] };
