# Metro Config Polyfills

To support Node core modules (and stub out `fs`) in React Native, install all of these polyfills:

npm install --save \
  assert \
  buffer \
  crypto-browserify \
  domain-browser \
  events \
  stream-http \
  https-browserify \
  os-browserify \
  path-browserify \
  punycode \
  process \
  querystring-es3 \
  stream-browserify \
  string_decoder \
  timers-browserify \
  tty-browserify \
  url \
  util \
  browserify-zlib \
  net-browserify \
  tls-browserify

Then restart Metro:

expo start --clear
