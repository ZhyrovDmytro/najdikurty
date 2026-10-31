export function lowestPrice(priceInfo: string): number {
  const prices = Array.from(priceInfo.matchAll(/(\d+)(?:[-–]\d+)?\s*Kč/g), match => Number(match[1]));
  return Math.min(...prices);
}
