# Flex SDK Provider

[![npm](https://img.shields.io/npm/v/flex-sdk-provider.svg)](https://www.npmjs.com/package/flex-sdk-provider) [![Build Status](https://img.shields.io/travis/timdp/flex-sdk-provider.svg)](https://travis-ci.org/timdp/flex-sdk-provider) [![JavaScript Standard Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/feross/standard)

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

## Author

[Tim De Pauw](https://tmdpw.eu/)

## License

Copyright &copy; 2015 Tim De Pauw

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
