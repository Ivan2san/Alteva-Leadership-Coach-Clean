export const flags = {
  journeyV2: (import.meta.env.VITE_JOURNEY_V2 ?? "0") === "1",
} as const;
