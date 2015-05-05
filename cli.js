#!/usr/bin/env node

'use strict'

require('console-stamp')(console, 'HH:MM:ss.l')

var provider = require('./')
var argv = require('yargs')
  .usage('Usage: $0 [--force] VERSION [VERSION ...]')
  .demand(1)
  .count('force')
  .alias('f', 'force')
  .argv

var download = function (version) {
  console.info('Downloading Flex SDK %s ...', version)
  return provider.download(version)
    .then(function (dir) {
      console.info('Flex SDK v%s installed to %s', version, dir)
    }, function (err) {
      console.error('Error downloading Flex SDK v%s: %s', version, err)
    })
}

var check = function (version) {
  console.info('Checking for Flex SDK v%s', version)
  return provider.locate(version)
    .then(function (dir) {
      console.info('Flex SDK v%s available at %s', version, dir)
    }, function (err) {
      if (err.code !== 'ENOENT') {
        throw err
      }
      return download(version)
    })
}

var reduce = function (arr, func) {
  if (arr.length) {
    return func(arr.shift()).then(function () {
      return reduce(arr, func)
    })
  }
}

var versions = argv._
if (versions.length === 1 && versions[0] === 'all') {
  versions = provider.versions()
  console.info('Getting ALL Flex SDK versions: %s', versions.join(' '))
} else {
  console.info('Getting Flex SDK versions: %s', versions.join(' '))
}
reduce(versions, argv.force ? download : check)
  .catch(function (err) {
    console.error('Unexpected error:', err)
  })
