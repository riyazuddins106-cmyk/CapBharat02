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
  const port = 8080;
  const origin = domain ? `https://${domain}:${port}` : undefined;

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
