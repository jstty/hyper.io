'use strict';
var Hyper = require('../../../index.js');

// !-- FOR TESTS
var options = null;
try {
  options = JSON.parse(process.env.HYPER_OPTIONS);
}
catch (err) {}
// --!

// Load config and routes
var hyper = new Hyper(options);

// load config and routes
var app = hyper.start({
  routes: [
    {
      api:    '/hello',
      method: {
        get: function world ($done, $sharedConfig, $logger) {
          $logger.log('hello world config:', $sharedConfig);
          $done($sharedConfig);
        }
      }
    }
  ]
});

// !-- FOR TESTS
module.exports = app;
// --!
