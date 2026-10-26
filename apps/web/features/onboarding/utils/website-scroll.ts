export type WebsiteScrollDirection = "up" | "down" | "top" | "bottom";

/** Returns the next scroll position, or null when the requested movement is impossible. */
export function calculateWebsiteScrollTarget(
  direction: WebsiteScrollDirection,
  current: number,
  maxScroll: number,
  viewportHeight: number,
) {
  const boundedCurrent = Math.max(0, Math.min(current, maxScroll));
  const step = Math.max(1, Math.round(viewportHeight * 0.75));
  const target = direction === "top"
    ? 0
    : direction === "bottom"
      ? maxScroll
      : direction === "down"
        ? Math.min(maxScroll, boundedCurrent + step)
        : Math.max(0, boundedCurrent - step);
  return target === boundedCurrent ? null : target;
}
