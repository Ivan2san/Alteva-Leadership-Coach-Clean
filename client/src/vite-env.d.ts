/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JOURNEY_V2?: string; // "0" | "1"
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="@testing-library/jest-dom" />
