export function getStaggerDelay(index: number, step = 70, max = 420, offset = 0): number {
  const itemIndex = Math.max(0, Math.floor(index));
  return Math.min(Math.max(0, offset) + itemIndex * Math.max(0, step), Math.max(0, max));
}
