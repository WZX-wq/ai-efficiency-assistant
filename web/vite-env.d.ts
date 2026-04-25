/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  readonly VITE_MODEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
