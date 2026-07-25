const { getDefaultConfig } = require('expo/metro-config');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('pdf');

config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url.startsWith('/api')) {
        createProxyMiddleware({
          target: 'https://98.94.185.164.nip.io',
          changeOrigin: true,
          secure: false,
        })(req, res, next);
      } else {
        middleware(req, res, next);
      }
    };
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
