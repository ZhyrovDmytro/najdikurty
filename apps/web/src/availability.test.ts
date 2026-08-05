import { describe, expect, it } from "vitest";
import {
  buildBookableSlots,
  buildDurationOptions,
  buildTimeOptions,
  formatDuration,
  formatTimeWindow,
  type AvailabilityResult
} from "./availability";

const availability: AvailabilityResult = {
  fetchedAt: "2026-08-04T00:00:00.000Z",
  sourceUrl: "https://example.com",
  date: "2026-08-04",
  dayRange: { start: "08:00", end: "11:00" },
  sport: "padel",
  courts: [
    {
      court: "Padel 1",
      blocks: [],
      freeSlots: [{ start: "08:00", end: "10:00" }]
    },
    {
      court: "Padel 2",
      blocks: [],
      freeSlots: [{ start: "08:30", end: "10:30" }]
    }
  ]
};

describe("availability helpers", () => {
  it("returns only slots where enough courts are free at the same time", () => {
    expect(buildBookableSlots(availability, 60, 2)).toEqual([
      {
        start: "08:30",
        end: "09:30",
        courts: ["Padel 1", "Padel 2"]
      },
      {
        start: "09:00",
        end: "10:00",
        courts: ["Padel 1", "Padel 2"]
      }
    ]);
  });

  it("builds duration options from 60 minutes up to the whole visible day", () => {
    expect(buildDurationOptions(availability.dayRange)).toEqual([60, 90, 120, 150, 180]);
    expect(formatDuration(180, availability.dayRange)).toBe("Whole day");
  });

  it("keeps 30-minute start steps even when a provider has smaller source slots", () => {
    expect(buildBookableSlots({ ...availability, slotStepMinutes: 15 }, 30, 2)).toEqual([
      {
        start: "08:30",
        end: "09:00",
        courts: ["Padel 1", "Padel 2"]
      },
      {
        start: "09:00",
        end: "09:30",
        courts: ["Padel 1", "Padel 2"]
      },
      {
        start: "09:30",
        end: "10:00",
        courts: ["Padel 1", "Padel 2"]
      }
    ]);
  });

  it("does not show slots below a provider minimum booking duration", () => {
    expect(buildBookableSlots({ ...availability, minBookingMinutes: 60 }, 30, 1)).toEqual([]);
    expect(buildBookableSlots({ ...availability, minBookingMinutes: 60 }, 60, 1)).toHaveLength(4);
  });

  it("uses exact duration-specific provider slots when they are present", () => {
    const exactAvailability: AvailabilityResult = {
      ...availability,
      dayRange: { start: "21:00", end: "23:59" },
      minBookingMinutes: 60,
      durationAvailability: {
        "60": [
          {
            court: "Kurt 1",
            blocks: [],
            freeSlots: [{ start: "21:30", end: "22:30" }]
          },
          {
            court: "Kurt 2",
            blocks: [],
            freeSlots: [{ start: "21:30", end: "22:30" }]
          }
        ],
        "120": [
          {
            court: "Kurt 1",
            blocks: [],
            freeSlots: [{ start: "22:00", end: "23:59" }]
          }
        ]
      }
    };

    expect(buildBookableSlots(exactAvailability, 90, 1)).toEqual([]);
    expect(buildBookableSlots(exactAvailability, 120, 1)).toEqual([
      {
        start: "22:00",
        end: "23:59",
        courts: ["Kurt 1"]
      }
    ]);
    expect(buildBookableSlots(exactAvailability, 60, 2)).toEqual([
      {
        start: "21:30",
        end: "22:30",
        courts: ["Kurt 1", "Kurt 2"]
      }
    ]);
  });

  it("filters slots to the selected start and end time", () => {
    expect(buildBookableSlots(availability, 60, 1, { start: "09:00", end: "10:00" })).toEqual([
      {
        start: "09:00",
        end: "10:00",
        courts: ["Padel 1", "Padel 2"]
      }
    ]);
  });

  it("does not show today's slots when the start time has already passed in Prague", () => {
    const eveningAvailability: AvailabilityResult = {
      ...availability,
      date: "2026-08-04",
      dayRange: { start: "18:00", end: "21:00" },
      courts: [
        {
          court: "Padel 1",
          blocks: [],
          freeSlots: [{ start: "18:00", end: "21:00" }]
        }
      ]
    };

    expect(buildBookableSlots(eveningAvailability, 60, 1, eveningAvailability.dayRange, new Date("2026-08-04T16:42:05.000Z"))).toEqual([
      {
        start: "19:00",
        end: "20:00",
        courts: ["Padel 1"]
      },
      {
        start: "19:30",
        end: "20:30",
        courts: ["Padel 1"]
      },
      {
        start: "20:00",
        end: "21:00",
        courts: ["Padel 1"]
      }
    ]);
  });

  it("keeps future date slots even when their time is earlier than the current time", () => {
    expect(buildBookableSlots({ ...availability, date: "2026-08-05" }, 60, 2, availability.dayRange, new Date("2026-08-04T16:42:05.000Z"))).toEqual([
      {
        start: "08:30",
        end: "09:30",
        courts: ["Padel 1", "Padel 2"]
      },
      {
        start: "09:00",
        end: "10:00",
        courts: ["Padel 1", "Padel 2"]
      }
    ]);
  });

  it("filters exact duration-specific slots that already started today", () => {
    const exactAvailability: AvailabilityResult = {
      ...availability,
      date: "2026-08-04",
      dayRange: { start: "18:00", end: "21:00" },
      durationAvailability: {
        "60": [
          {
            court: "Kurt 1",
            blocks: [],
            freeSlots: [
              { start: "18:30", end: "19:30" },
              { start: "19:00", end: "20:00" }
            ]
          }
        ]
      }
    };

    expect(buildBookableSlots(exactAvailability, 60, 1, exactAvailability.dayRange, new Date("2026-08-04T16:42:05.000Z"))).toEqual([
      {
        start: "19:00",
        end: "20:00",
        courts: ["Kurt 1"]
      }
    ]);
  });

  it("builds 30-minute time picker options and labels the full range", () => {
    expect(buildTimeOptions({ start: "08:00", end: "09:30" })).toEqual(["08:00", "08:30", "09:00", "09:30"]);
    expect(buildTimeOptions({ start: "00:00", end: "23:59" }).slice(0, 3)).toEqual(["00:00", "00:30", "01:00"]);
    expect(buildTimeOptions({ start: "00:00", end: "23:59" }).at(-1)).toBe("23:59");
    expect(formatTimeWindow({ start: "08:00", end: "09:30" }, { start: "08:00", end: "09:30" })).toBe("Whole day");
    expect(formatTimeWindow({ start: "08:30", end: "09:30" }, { start: "08:00", end: "09:30" })).toBe("08:30-09:30");
  });
});
