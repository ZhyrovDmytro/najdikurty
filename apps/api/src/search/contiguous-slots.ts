import type { ContiguousAvailabilityWindow, IndexedAvailabilitySegment } from "./types.js";

export function findContiguousAvailability(
  input: IndexedAvailabilitySegment[],
  durationMinutes: number
): ContiguousAvailabilityWindow[] {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error("durationMinutes must be a positive integer");
  }

  const segments = deduplicateConservatively(input);
  const byCourt = groupBy(segments, (segment) => segment.courtId);
  const results: ContiguousAvailabilityWindow[] = [];

  for (const courtSegments of byCourt.values()) {
    const available = courtSegments.filter((segment) => segment.available);
    const byStart = groupBy(available, (segment) => segment.startsAt.getTime());
    const candidateStarts = [...byStart.keys()].sort((a, b) => a - b);

    for (const startMs of candidateStarts) {
      const startingSegment = byStart.get(startMs)?.[0];
      if (!startingSegment) continue;
      if (durationMinutes < (startingSegment.clubMinBookingMinutes ?? 0)) continue;

      const targetEndMs = startMs + durationMinutes * 60_000;
      if (startMs < startingSegment.windowStartsAt.getTime() || targetEndMs > startingSegment.windowEndsAt.getTime()) {
        continue;
      }

      const chain = findExactAdjacentChain(startMs, targetEndMs, byStart, new Set());
      if (chain) {
        results.push({ startsAt: new Date(startMs), endsAt: new Date(targetEndMs), segments: chain });
      }
    }
  }

  return results.sort((a, b) =>
    a.startsAt.getTime() - b.startsAt.getTime() ||
    a.segments[0]!.clubName.localeCompare(b.segments[0]!.clubName) ||
    a.segments[0]!.courtName.localeCompare(b.segments[0]!.courtName)
  );
}

function findExactAdjacentChain(
  cursorMs: number,
  targetEndMs: number,
  byStart: ReadonlyMap<number, IndexedAvailabilitySegment[]>,
  visited: Set<string>
): IndexedAvailabilitySegment[] | undefined {
  const candidates = [...(byStart.get(cursorMs) ?? [])]
    .filter((segment) => segment.endsAt.getTime() <= targetEndMs && segment.endsAt.getTime() > cursorMs)
    .sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime());

  for (const segment of candidates) {
    if (visited.has(segment.id)) continue;
    const endMs = segment.endsAt.getTime();
    if (endMs === targetEndMs) return [segment];

    const nextVisited = new Set(visited).add(segment.id);
    const remainder = findExactAdjacentChain(endMs, targetEndMs, byStart, nextVisited);
    if (remainder) return [segment, ...remainder];
  }

  return undefined;
}

function deduplicateConservatively(input: IndexedAvailabilitySegment[]): IndexedAvailabilitySegment[] {
  const byIdentity = new Map<string, IndexedAvailabilitySegment>();

  for (const segment of input) {
    const identity = [segment.clubId, segment.courtId, segment.startsAt.toISOString(), segment.endsAt.toISOString()].join("|");
    const current = byIdentity.get(identity);
    if (
      !current ||
      segment.fetchedAt > current.fetchedAt ||
      (segment.fetchedAt.getTime() === current.fetchedAt.getTime() && !segment.available && current.available)
    ) {
      byIdentity.set(identity, segment);
    }
  }

  return [...byIdentity.values()];
}

function groupBy<T, K>(values: T[], keyFor: (value: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const value of values) {
    const key = keyFor(value);
    const group = groups.get(key);
    if (group) group.push(value);
    else groups.set(key, [value]);
  }
  return groups;
}
