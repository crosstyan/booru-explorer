/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly WS_ENDPOINT: string
  readonly QUERY_API_ENDPOINT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
