import type { TimeRange } from "./availability";

export function czechCourtCount(count: number): string {
  return `${count} ${count === 1 ? "padelový kurt" : count >= 2 && count <= 4 ? "padelové kurty" : "padelových kurtů"}`;
}

export function matchesDirectoryFilters(
  club: { name: string; address: string; district: string; courtTypes: string[]; acceptsMultisport?: boolean },
  filters: { query: string; district: string; courtType: string; multisport: boolean }
): boolean {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
  return normalize(`${club.name} ${club.address}`).includes(normalize(filters.query))
    && (!filters.district || club.district === filters.district)
    && (filters.courtType === "all" || club.courtTypes.includes(filters.courtType))
    && (!filters.multisport || club.acceptsMultisport === true);
}

export function formatOpeningHours(
  openingHours: Record<number, TimeRange> | undefined,
  weekdayLabels: string[],
  dailyLabel: string,
  notPublishedLabel: string
): string {
  const orderedDays = [1, 2, 3, 4, 5, 6, 0];
  const entries = orderedDays.flatMap((day, index) => openingHours?.[day] ? [{ day, index, range: openingHours[day] }] : []);
  if (!entries.length) return notPublishedLabel;
  const first = entries[0].range;
  if (entries.length === 7 && entries.every(({ range }) => range.start === first.start && range.end === first.end)) {
    return `${dailyLabel} ${first.start}–${first.end}`;
  }
  const groups: Array<{ start: number; end: number; range: TimeRange }> = [];
  for (const { index, range } of entries) {
    const previous = groups.at(-1);
    if (previous && previous.end + 1 === index && previous.range.start === range.start && previous.range.end === range.end) previous.end = index;
    else groups.push({ start: index, end: index, range });
  }
  return groups.map(({ start, end, range }) => `${weekdayLabels[start]}${end === start ? "" : `–${weekdayLabels[end]}`} ${range.start}–${range.end}`).join(", ");
}
