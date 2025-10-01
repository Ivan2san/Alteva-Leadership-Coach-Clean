/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_MSW_BYPASS?: string
  readonly VITE_ENABLE_MSW?: string
  readonly VITE_JOURNEY_V2?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
