const appJson = require('./app.json');

/**
 * Dynamic wrapper around app.json.
 *
 * Why this exists: Expo's dev-server CORS middleware only allows requests whose
 * Origin matches localhost or `expo.extra.router.origin` / `headOrigin`. When this
 * app is opened through Replit's public dev domain (not localhost), asset/font
 * requests (e.g. the Ionicons font file) get rejected with "Unauthorized request"
 * unless that domain is explicitly allowlisted here.
 */
module.exports = ({ config }) => {
  const domain = process.env.REPLIT_DEV_DOMAIN;
  // No port — Replit proxy serves on standard 443; the browser origin has no port.
  // Including :8099 here makes the allowlist useless and breaks CORS (same fix as customer app).
  const origin = domain ? `https://${domain}` : undefined;

  return {
    ...appJson.expo,
    ...config,
    extra: {
      ...(appJson.expo.extra || {}),
      ...(config.extra || {}),
      router: {
        ...((appJson.expo.extra || {}).router || {}),
        ...((config.extra || {}).router || {}),
        ...(origin ? { origin, headOrigin: origin } : {}),
      },
    },
  };
};
