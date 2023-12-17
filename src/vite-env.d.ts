/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_ENDPOINT: string
  readonly VITE_QUERY_API_ENDPOINT: string
  readonly VITE_FILE_WS_ENDPOINT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
