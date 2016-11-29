'use strict';

module.exports = {
  env: 'dev',
  serviceManager: {
    silent: false,
    displayDebuggerInfo: false
  },
  httpFramework: {
    port: 8000,
    silent: false,
    displayDebuggerInfo: false
  },
  hyper: {
    logger: { // logz options
      name: 'Hyper',
      group: {
        autoIndent: true,
        indent: {
          // https://github.com/jamestalmage/cli-table2/blob/master/src/utils.js
          start: '└─┐',
          line: '  ├',
          end: '┌─┘',
          inner: '  ',
          split: '  ',
          join: '  '
        }
      }
    },
    displayDebuggerInfo: false,
    httpFramework: 'express' // TODO: make this an object
  }
};