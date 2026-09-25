export function logASR(message: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.info(`[ASR] ${message}`);
}
