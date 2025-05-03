// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Path to our empty stub for `fs`
const emptyModule = path.resolve(__dirname, 'empty.js');

config.resolver.extraNodeModules = {
  assert:          require.resolve('assert/'),
  buffer:          require.resolve('buffer/'),
  crypto:          require.resolve('crypto-browserify'),
  domain:          require.resolve('domain-browser'),
  events:          require.resolve('events/'),
  http:            require.resolve('stream-http'),
  https:           require.resolve('https-browserify'),
  os:              require.resolve('os-browserify/browser'),
  path:            require.resolve('path-browserify'),
  punycode:        require.resolve('punycode/'),
  process:         require.resolve('process/browser'),
  querystring:     require.resolve('querystring-es3'),
  stream:          require.resolve('stream-browserify'),
  string_decoder:  require.resolve('string_decoder/'),
  timers:          require.resolve('timers-browserify'),
  tty:             require.resolve('tty-browserify'),
  url:             require.resolve('url/'),
  util:            require.resolve('util/'),
  zlib:            require.resolve('browserify-zlib'),
  net:             require.resolve('net-browserify'),
  tls:             require.resolve('tls-browserify'),
  // stub out fs so `send` (and any other server-side code) doesn’t break the bundle
  fs:              emptyModule,
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
