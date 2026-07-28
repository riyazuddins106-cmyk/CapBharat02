const appJson = require('./app.json');

/**
 * Dynamic wrapper around app.json.
 *
 * Why this exists: Expo's dev-server CORS middleware only allows requests whose
 * Origin matches localhost or `expo.extra.router.origin` / `headOrigin`. When this
 * app is opened through Replit's public dev domain in a browser (web mode), asset
 * and font requests get rejected with "Unauthorized request" unless that domain is
 * explicitly allowlisted here.
 *
 * IMPORTANT: Do NOT include a port number in the origin. The Replit browser proxy
 * terminates TLS on port 443 — the browser sends `Origin: https://<domain>` (no
 * port). Including `:8080` here makes the allowlist useless and breaks CORS.
 *
 * Also: these fields are web-only (expo-router Head / CORS). They have no effect
 * on native Expo Go, so we only inject them when REPLIT_DEV_DOMAIN is set.
 */
module.exports = ({ config }) => {
  const domain = process.env.REPLIT_DEV_DOMAIN;
  // No port — Replit proxy serves on standard 443; the browser origin has no port.
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
