#!/usr/bin/env node

'use strict'

import consoleStamp from 'console-stamp'
import yargs from 'yargs'
import provider from './'

consoleStamp(console, 'HH:MM:ss.l')

const argv = yargs
  .usage('Usage: $0 [--force] VERSION [VERSION ...]')
  .demand(1)
  .count('force')
  .alias('f', 'force')
  .argv

const download = (version) => {
  console.info('Downloading Flex SDK %s ...', version)
  return provider.download(version)
    .then((dir) => console.info('Flex SDK v%s installed to %s', version, dir))
    .catch((err) => console.error('Error downloading Flex SDK v%s: %s', version, err.stack))
}

const check = (version) => {
  console.info('Checking for Flex SDK v%s', version)
  return provider.locate(version)
    .then((dir) => console.info('Flex SDK v%s available at %s', version, dir))
    .catch((err) => {
      if (err.code !== 'ENOENT') {
        throw err
      }
      return download(version)
    })
}

const reduce = (arr, func) => {
  if (arr.length) {
    return func(arr.shift()).then(() => reduce(arr, func))
  }
}

let versions = argv._
if (versions.length === 1 && versions[0] === 'all') {
  versions = provider.versions
  console.info('Getting ALL Flex SDK versions: %s', versions.join(' '))
} else {
  console.info('Getting Flex SDK versions: %s', versions.join(' '))
}
reduce(versions, argv.force ? download : check)
  .catch((err) => console.error('Unexpected error: %s', err.stack))
