import { describe, expect, it } from "vitest";
import { planAvailabilityReconciliation } from "./reconciliation.js";
import type { AvailabilitySlotInput } from "./repository.js";
import type { AvailabilitySlotRow } from "./schema.js";

const fetchedAt = new Date("2026-08-21T07:00:00Z");
const baseInput: AvailabilitySlotInput = {
  clubId: "club-1",
  courtId: "court-1",
  startsAt: new Date("2026-08-21T08:00:00Z"),
  endsAt: new Date("2026-08-21T09:00:00Z"),
  available: true,
  price: 500,
  currency: "CZK",
  bookingUrl: "https://example.test/book",
  sourceHash: "hash-1",
  fetchedAt
};

function row(overrides: Partial<AvailabilitySlotRow> = {}): AvailabilitySlotRow {
  return {
    id: "slot-1",
    ...baseInput,
    price: baseInput.price ?? null,
    currency: baseInput.currency ?? null,
    bookingUrl: baseInput.bookingUrl ?? null,
    sourceHash: baseInput.sourceHash ?? null,
    createdAt: fetchedAt,
    updatedAt: fetchedAt,
    ...overrides
  };
}

describe("planAvailabilityReconciliation", () => {
  it("refreshes unchanged returned slots without counting a state change", () => {
    const plan = planAvailabilityReconciliation([row()], [{ ...baseInput, fetchedAt: new Date() }], true);
    expect(plan.recordsChanged).toBe(0);
    expect(plan.missingIds).toEqual([]);
  });

  it("marks missing available slots only for complete provider responses", () => {
    expect(planAvailabilityReconciliation([row()], [], true)).toMatchObject({
      recordsChanged: 1,
      missingIds: ["slot-1"]
    });
    expect(planAvailabilityReconciliation([row()], [], false)).toMatchObject({
      recordsChanged: 0,
      missingIds: []
    });
  });

  it("does not count a missing slot already known as unavailable as changed", () => {
    expect(planAvailabilityReconciliation([row({ available: false })], [], true).recordsChanged).toBe(0);
  });

  it("deduplicates equivalent provider records before persistence", () => {
    const plan = planAvailabilityReconciliation([], [baseInput, { ...baseInput }], true);
    expect(plan.incoming).toHaveLength(1);
    expect(plan.recordsChanged).toBe(1);
  });

  it("counts price or availability changes on an existing identity", () => {
    const plan = planAvailabilityReconciliation(
      [row()],
      [{ ...baseInput, available: false, price: 450 }],
      true
    );
    expect(plan.recordsChanged).toBe(1);
  });
});
