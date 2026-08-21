import type { AvailabilitySlotInput } from "./repository.js";
import type { AvailabilitySlotRow } from "./schema.js";

type ComparableSlot = Pick<
  AvailabilitySlotInput,
  "clubId" | "courtId" | "startsAt" | "endsAt" | "available" | "price" | "currency" | "bookingUrl" | "sourceHash"
>;

export interface AvailabilityReconciliationPlan {
  incoming: AvailabilitySlotInput[];
  missingIds: string[];
  recordsChanged: number;
}

export function planAvailabilityReconciliation(
  existing: AvailabilitySlotRow[],
  incoming: AvailabilitySlotInput[],
  complete: boolean
): AvailabilityReconciliationPlan {
  const deduplicatedIncoming = deduplicateAvailabilitySlots(incoming);
  const existingByIdentity = new Map(existing.map((slot) => [availabilitySlotIdentity(slot), slot]));
  const incomingIdentities = new Set(deduplicatedIncoming.map(availabilitySlotIdentity));
  let recordsChanged = 0;

  for (const slot of deduplicatedIncoming) {
    const current = existingByIdentity.get(availabilitySlotIdentity(slot));
    if (!current || slotStateChanged(current, slot)) recordsChanged += 1;
  }

  const missing = complete ? existing.filter((slot) => !incomingIdentities.has(availabilitySlotIdentity(slot))) : [];
  recordsChanged += missing.filter((slot) => slot.available).length;

  return {
    incoming: deduplicatedIncoming,
    missingIds: missing.map((slot) => slot.id),
    recordsChanged
  };
}

export function deduplicateAvailabilitySlots(inputs: AvailabilitySlotInput[]): AvailabilitySlotInput[] {
  const byIdentity = new Map<string, AvailabilitySlotInput>();
  for (const input of inputs) byIdentity.set(availabilitySlotIdentity(input), input);
  return [...byIdentity.values()];
}

function availabilitySlotIdentity(slot: Pick<ComparableSlot, "clubId" | "courtId" | "startsAt" | "endsAt">): string {
  return [slot.clubId, slot.courtId, slot.startsAt.toISOString(), slot.endsAt.toISOString()].join("|");
}

function slotStateChanged(current: ComparableSlot, incoming: ComparableSlot): boolean {
  return current.available !== incoming.available ||
    nullable(current.price) !== nullable(incoming.price) ||
    nullable(current.currency) !== nullable(incoming.currency) ||
    nullable(current.bookingUrl) !== nullable(incoming.bookingUrl) ||
    nullable(current.sourceHash) !== nullable(incoming.sourceHash);
}

function nullable<T>(value: T | null | undefined): T | null {
  return value ?? null;
}
