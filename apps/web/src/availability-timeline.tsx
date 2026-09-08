import { useId, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { localizeCourtName, toMinutes, type AvailabilityResult, type TimeRange } from "./availability";

const PIXELS_PER_HOUR = 64;
const COMPACT_PIXELS_PER_HOUR = 42;
const TIMELINE_CELL_MINUTES = 30;

interface TimelineStyle extends CSSProperties {
  "--timeline-label-width": string;
  "--timeline-width": string;
}

export function AvailabilityTimeline({
  availability,
  bookingUrl,
  compact = false,
  onFreeSlotClick
}: {
  availability: AvailabilityResult;
  bookingUrl: string;
  compact?: boolean;
  onFreeSlotClick?: (court: string, slot: TimeRange) => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const start = toMinutes(availability.dayRange.start);
  const end = toMinutes(availability.dayRange.end);
  const duration = Math.max(end - start, 1);
  const hourSegments = buildHourSegments(availability.dayRange);
  const cellBoundaries = buildCellBoundaries(availability.dayRange);
  const pixelsPerHour = compact ? COMPACT_PIXELS_PER_HOUR : PIXELS_PER_HOUR;
  const style: TimelineStyle = {
    "--timeline-label-width": compact ? "60px" : "84px",
    "--timeline-width": `${Math.max(compact ? 480 : 640, Math.round((duration / 60) * pixelsPerHour))}px`
  };

  return (
    <section className={`availabilityTimeline ${compact ? "availabilityTimeline-compact" : ""}`} aria-labelledby={titleId}>
      <div className="availabilityTimelineHeader">
        <h3 id={titleId}>{t("club.fullAvailability")}</h3>
        <div className="availabilityTimelineLegend" aria-label={t("club.timelineLegend")}>
          <span><i className="timelineLegendSwatch timelineLegendSwatch-free" />{t("club.free")}</span>
          <span><i className="timelineLegendSwatch timelineLegendSwatch-unavailable" />{t("club.unavailable")}</span>
        </div>
      </div>

      <div className="availabilityTimelineScroller" tabIndex={0}>
        <div className="availabilityTimelineGrid" style={style}>
          <div className="timelineCorner" aria-hidden="true" />
          <div className="timelineAxis" aria-hidden="true">
            {hourSegments.map((hour) => (
              <span
                className="timelineHourCell"
                key={hour.start}
                style={{
                  left: `${positionPercent(hour.start, start, duration)}%`,
                  width: `${((hour.end - hour.start) / duration) * 100}%`
                }}
              >
                {hour.label}
              </span>
            ))}
          </div>

          {availability.courts.map((court) => {
            const courtLabel = localizeCourtName(court.court, t("club.providerCourtPrefix"));
            return (
            <div className="timelineRow" key={court.court}>
              <div className="timelineCourtName" title={courtLabel}>{courtLabel}</div>
              <div className="timelineTrack">
                {cellBoundaries.map((boundary) => (
                  <i className="timelineGridLine" aria-hidden="true" key={boundary} style={{ left: `${positionPercent(boundary, start, duration)}%` }} />
                ))}
                {court.freeSlots.flatMap((slot) => splitIntoTimelineCells(slot, start, end)).map((cell, index) => {
                  const width = ((cell.end - cell.start) / duration) * 100;
                  const cellRange = { start: toTime(cell.start), end: toTime(cell.end) };
                  const label = t("club.freeSlot", cellRange);

                  return (
                    <a
                      aria-label={label}
                      className="timelineFreeSlot"
                      href={bookingUrl}
                      key={`${cell.start}-${cell.end}-${index}`}
                      onClick={() => onFreeSlotClick?.(court.court, cellRange)}
                      rel="noreferrer"
                      style={{
                        left: `${positionPercent(cell.start, start, duration)}%`,
                        width: `${width}%`
                      }}
                      target="_blank"
                      title={label}
                    >
                      {width >= 9 ? `${cellRange.start}–${cellRange.end}` : null}
                    </a>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function buildHourSegments(dayRange: TimeRange): Array<{ start: number; end: number; label: string }> {
  const start = toMinutes(dayRange.start);
  const end = toMinutes(dayRange.end);
  const segments: Array<{ start: number; end: number; label: string }> = [];

  for (let hour = Math.floor(start / 60) * 60; hour < end; hour += 60) {
    const segmentStart = Math.max(hour, start);
    const segmentEnd = Math.min(hour + 60, end);
    segments.push({
      start: segmentStart,
      end: segmentEnd,
      label: segmentStart === hour ? toTime(hour) : dayRange.start
    });
  }
  return segments;
}

function buildCellBoundaries(dayRange: TimeRange): number[] {
  const start = toMinutes(dayRange.start);
  const end = toMinutes(dayRange.end);
  const boundaries: number[] = [];
  for (let minutes = Math.ceil(start / TIMELINE_CELL_MINUTES) * TIMELINE_CELL_MINUTES; minutes < end; minutes += TIMELINE_CELL_MINUTES) {
    boundaries.push(minutes);
  }
  return boundaries;
}

function splitIntoTimelineCells(range: TimeRange, start: number, end: number): Array<{ start: number; end: number }> {
  const clippedStart = Math.max(toMinutes(range.start), start);
  const clippedEnd = Math.min(toMinutes(range.end), end);
  const cells: Array<{ start: number; end: number }> = [];
  for (let cellStart = clippedStart; cellStart < clippedEnd; cellStart += TIMELINE_CELL_MINUTES) {
    cells.push({ start: cellStart, end: Math.min(cellStart + TIMELINE_CELL_MINUTES, clippedEnd) });
  }
  return cells;
}

function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function positionPercent(value: number, start: number, duration: number): number {
  return ((value - start) / duration) * 100;
}
