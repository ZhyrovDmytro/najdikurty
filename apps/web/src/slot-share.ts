export interface ShareableSlot {
  id: string;
  clubName: string;
  date: string;
  start: string;
  end: string;
  courtNames: string[];
  bookingUrl: string;
  priceLabel?: string;
  multisportLabel?: string;
  courtTypeLabels?: string[];
}

export interface ShareImageCopy {
  title: string;
  subtitle: string;
  availabilityNote: string;
}

const IMAGE_WIDTH = 1080;
const PAGE_PADDING = 64;
const CLUB_HEADER_HEIGHT = 100;
const SLOT_ROW_HEIGHT = 68;
const FOOTER_HEIGHT = 92;
const SLOT_COLUMNS = 3;
const SLOT_GAP = 12;

export async function shareSlotsAsImage(slots: ShareableSlot[], copy: ShareImageCopy): Promise<"shared" | "downloaded"> {
  const blob = await renderSlotsImage(slots, copy);
  const file = new File([blob], "hledejkurty-availability.png", { type: "image/png" });
  const shareData = buildImageShareData(file);

  if (navigator.share && navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      downloadBlob(blob, file.name);
      return "downloaded";
    }
  }

  downloadBlob(blob, file.name);
  return "downloaded";
}

export function buildImageShareData(file: File): ShareData {
  return { files: [file] };
}

async function renderSlotsImage(slots: ShareableSlot[], copy: ShareImageCopy): Promise<Blob> {
  const groups = groupSlots(slots);
  const groupHeight = groups.reduce((height, group) => {
    return height + CLUB_HEADER_HEIGHT + Math.ceil(group.slots.length / SLOT_COLUMNS) * SLOT_ROW_HEIGHT + 24;
  }, 0);
  const height = Math.max(720, 238 + groupHeight + FOOTER_HEIGHT);
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_WIDTH;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported");

  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, IMAGE_WIDTH, height);
  context.fillStyle = "#067647";
  context.fillRect(0, 0, IMAGE_WIDTH, 18);

  context.fillStyle = "#101828";
  context.font = "800 48px Inter, system-ui, sans-serif";
  context.fillText(copy.title, PAGE_PADDING, 92);
  context.fillStyle = "#067647";
  context.font = "800 22px Inter, system-ui, sans-serif";
  const brand = "hledejkurty.cz";
  context.fillText(brand, IMAGE_WIDTH - PAGE_PADDING - context.measureText(brand).width, 92);
  context.fillStyle = "#475467";
  context.font = "500 25px Inter, system-ui, sans-serif";
  context.fillText(copy.subtitle, PAGE_PADDING, 138);

  let y = 190;
  for (const group of groups) {
    context.fillStyle = "#ffffff";
    roundedRect(context, PAGE_PADDING, y, IMAGE_WIDTH - PAGE_PADDING * 2, CLUB_HEADER_HEIGHT + Math.ceil(group.slots.length / SLOT_COLUMNS) * SLOT_ROW_HEIGHT + 14, 18);
    context.fill();
    context.strokeStyle = "#d0d5dd";
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = "#101828";
    context.font = "800 25px Inter, system-ui, sans-serif";
    context.fillText(group.clubName, PAGE_PADDING + 24, y + 38);
    context.fillStyle = "#667085";
    context.font = "600 20px Inter, system-ui, sans-serif";
    const dateWidth = context.measureText(group.date).width;
    context.fillText(group.date, IMAGE_WIDTH - PAGE_PADDING - 24 - dateWidth, y + 37);

    const representativeSlot = group.slots[0];
    let badgeX = PAGE_PADDING + 24;
    const badgeY = y + 54;
    if (representativeSlot?.priceLabel) {
      badgeX += drawBadge(context, representativeSlot.priceLabel, badgeX, badgeY, "#ecfdf3", "#067647", "#abefc6") + 8;
    }
    if (representativeSlot?.multisportLabel) {
      badgeX += drawBadge(context, representativeSlot.multisportLabel, badgeX, badgeY, "#f4f3ff", "#5925dc", "#d9d6fe") + 8;
    }
    representativeSlot?.courtTypeLabels?.forEach((label, index) => {
      const colors = index % 2 === 0
        ? ["#eff8ff", "#175cd3", "#b2ddff"] as const
        : ["#fffaeb", "#b54708", "#fedf89"] as const;
      badgeX += drawBadge(context, label, badgeX, badgeY, colors[0], colors[1], colors[2]) + 8;
    });

    group.slots.forEach((slot, index) => {
      const column = index % SLOT_COLUMNS;
      const row = Math.floor(index / SLOT_COLUMNS);
      const slotWidth = (IMAGE_WIDTH - PAGE_PADDING * 2 - 40 - SLOT_GAP * (SLOT_COLUMNS - 1)) / SLOT_COLUMNS;
      const slotX = PAGE_PADDING + 20 + column * (slotWidth + SLOT_GAP);
      const slotY = y + CLUB_HEADER_HEIGHT + row * SLOT_ROW_HEIGHT;
      context.fillStyle = "#ecfdf3";
      roundedRect(context, slotX, slotY, slotWidth, 54, 12);
      context.fill();
      context.strokeStyle = "#abefc6";
      context.lineWidth = 1.5;
      context.stroke();
      context.fillStyle = "#067647";
      context.font = "800 19px Inter, system-ui, sans-serif";
      context.fillText(`${slot.start}–${slot.end}`, slotX + 13, slotY + 23);
      context.fillStyle = "#475467";
      context.font = "500 14px Inter, system-ui, sans-serif";
      const courts = ellipsize(context, slot.courtNames.join(" + "), slotWidth - 26);
      context.fillText(courts, slotX + 13, slotY + 43);
    });

    y += CLUB_HEADER_HEIGHT + Math.ceil(group.slots.length / SLOT_COLUMNS) * SLOT_ROW_HEIGHT + 24;
  }

  context.fillStyle = "#667085";
  context.font = "500 18px Inter, system-ui, sans-serif";
  context.fillText(copy.availabilityNote, PAGE_PADDING, height - 48);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create share image")), "image/png");
  });
}

function groupSlots(slots: ShareableSlot[]): Array<{ clubName: string; date: string; slots: ShareableSlot[] }> {
  const groups = new Map<string, { clubName: string; date: string; slots: ShareableSlot[] }>();
  for (const slot of slots) {
    const key = `${slot.clubName}\u0000${slot.date}`;
    const group = groups.get(key) ?? { clubName: slot.clubName, date: slot.date, slots: [] };
    group.slots.push(slot);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function ellipsize(context: CanvasRenderingContext2D, value: string, maxWidth: number): string {
  if (context.measureText(value).width <= maxWidth) return value;
  let shortened = value;
  while (shortened.length > 1 && context.measureText(`${shortened}…`).width > maxWidth) shortened = shortened.slice(0, -1);
  return `${shortened.trimEnd()}…`;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawBadge(
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  background: string,
  color: string,
  border: string
): number {
  context.font = "700 15px Inter, system-ui, sans-serif";
  const width = context.measureText(label).width + 22;
  context.fillStyle = background;
  roundedRect(context, x, y, width, 28, 14);
  context.fill();
  context.strokeStyle = border;
  context.lineWidth = 1;
  context.stroke();
  context.fillStyle = color;
  context.fillText(label, x + 11, y + 19);
  return width;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
