# Flex SDK Provider

[![npm](https://img.shields.io/npm/v/flex-sdk-provider.svg)](https://www.npmjs.com/package/flex-sdk-provider) [![Dependencies](https://img.shields.io/david/timdp/flex-sdk-provider.svg)](https://david-dm.org/timdp/flex-sdk-provider) [![Build Status](https://img.shields.io/travis/timdp/flex-sdk-provider/master.svg)](https://travis-ci.org/timdp/flex-sdk-provider) [![JavaScript Standard Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Wraps the Adobe/Apache Flex SDK in a Node module. Built as an alternative to
[flex-sdk](https://www.npmjs.com/package/flex-sdk) following
[SemVer issues](https://github.com/mojombo/semver/issues/242).

Not entirely sure where I'm going with this yet. Expect breakage.

## API

```js
var provider = require('flex-sdk-provider')

console.log('Available versions:', provider.versions)

// Get a specific version, optionally downloading it first
provider.get('4.12.0')
  .then(function (dir) {
    console.log('Flex SDK 4.12.0 is now at:', dir)
  })

// Download and extract a specific version, whether it exists or not
provider.download('4.14.0')
  .then(function (dir) {
    console.log('Flex SDK 4.14.0 downloaded and extracted to:', dir)
  })

// Locate a specific version, assuming it was already downloaded
provider.locate('4.14.1')
  .then(function (dir) {
    console.log('Flex SDK 4.14.1 is located at:', dir)
  })
```

## CLI

```bash
# Download and extract a version if it doesn't exist yet
$ provide-flex-sdk 4.6.0

# Download and extract a version even if it exists already
$ provide-flex-sdk --force 4.9.0

# Download all available versions
$ provide-flex-sdk all
```

## Caveat

The module attempts to avoid multiple simultaneous downloads of the same version
of the SDK. However, because Node.js does not support file locking yet, the
mechanism is far from perfect.

The [`fs-ext`](https://www.npmjs.com/package/fs-ext) module does add a native
`flock`, but at the time of this writing, it is not supported on Windows. It is
therefore not used at this point.

## Author

[Tim De Pauw](https://tmdpw.eu/)

## License

MIT
