// lib/flags.ts - Feature flags for the application
export const flags = {
  journeyV2: import.meta.env.VITE_JOURNEY_V2 !== "0",
};
