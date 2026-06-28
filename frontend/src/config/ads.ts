// ── AdSense configuration ────────────────────────────────────────────────────
// Ads stay OFF until ADSENSE_CLIENT is a real "ca-pub-################" id.
// To activate:
//   1. Replace ADSENSE_CLIENT with your real publisher id.
//   2. Create one Display ad unit per placement in AdSense, paste slot ids below.
//   3. Rebuild + redeploy.

export const ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX'; // <-- replace

export const ADS_ENABLED = /^ca-pub-\d{16}$/.test(ADSENSE_CLIENT);

export const SHOW_PLACEHOLDERS = true;

export const AD_SLOTS = {
  feedInline: '0000000000',
  exploreInline: '0000000000',
  profileTop: '0000000000',
  profileInline: '0000000000',
  sidebarTop: '0000000000',
  sidebarBottom: '0000000000',
} as const;
