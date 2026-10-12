const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const DRIVE_APP_URL = trimTrailingSlash(
  import.meta.env.VITE_DRIVE_APP_URL || (import.meta.env.DEV ? 'http://localhost:5910' : ''),
);

export const DRIVE_PARTNER_URL =
  import.meta.env.VITE_DRIVE_PARTNER_URL || (DRIVE_APP_URL ? `${DRIVE_APP_URL}/register/mitra` : '');

export const DRIVE_LINKS = {
  scan: DRIVE_APP_URL ? `${DRIVE_APP_URL}/check-condition` : '',
  login: DRIVE_APP_URL ? `${DRIVE_APP_URL}/login/user` : '',
  claims: DRIVE_APP_URL ? `${DRIVE_APP_URL}/claims` : '',
  insurance: DRIVE_APP_URL ? `${DRIVE_APP_URL}/insurance/search` : '',
  workshops: DRIVE_APP_URL ? `${DRIVE_APP_URL}/workshop-recommendations` : '',
  partner: DRIVE_PARTNER_URL,
} as const;
