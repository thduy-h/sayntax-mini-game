export function logASR(message: string) {
  if (process.env.NODE_ENV !== "development" && process.env.NEXT_PUBLIC_DEV_MODE !== "true") return;
  console.info(`[ASR] ${message}`);
}
