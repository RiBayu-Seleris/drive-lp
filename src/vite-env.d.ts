/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DRIVE_APP_URL?: string;
  readonly VITE_DRIVE_PARTNER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
