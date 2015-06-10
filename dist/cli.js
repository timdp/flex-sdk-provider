#!/usr/bin/env node


'use strict';

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

var _consoleStamp = require('console-stamp');

var _consoleStamp2 = _interopRequireDefault(_consoleStamp);

var _yargs = require('yargs');

var _yargs2 = _interopRequireDefault(_yargs);

var _ = require('./');

var _2 = _interopRequireDefault(_);

(0, _consoleStamp2['default'])(console, 'HH:MM:ss.l');

var argv = _yargs2['default'].usage('Usage: $0 [--force] VERSION [VERSION ...]').demand(1).count('force').alias('f', 'force').argv;

var download = function download(version) {
  console.info('Downloading Flex SDK %s ...', version);
  return _2['default'].download(version).then(function (dir) {
    return console.info('Flex SDK v%s installed to %s', version, dir);
  })['catch'](function (err) {
    return console.error('Error downloading Flex SDK v%s: %s', version, err.stack);
  });
};

var check = function check(version) {
  console.info('Checking for Flex SDK v%s', version);
  return _2['default'].locate(version).then(function (dir) {
    return console.info('Flex SDK v%s available at %s', version, dir);
  })['catch'](function (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    return download(version);
  });
};

var reduce = function reduce(arr, func) {
  if (arr.length) {
    return func(arr.shift()).then(function () {
      return reduce(arr, func);
    });
  }
};

var versions = argv._;
if (versions.length === 1 && versions[0] === 'all') {
  versions = _2['default'].versions;
  console.info('Getting ALL Flex SDK versions: %s', versions.join(' '));
} else {
  console.info('Getting Flex SDK versions: %s', versions.join(' '));
}
reduce(versions, argv.force ? download : check)['catch'](function (err) {
  return console.error('Unexpected error: %s', err.stack);
});