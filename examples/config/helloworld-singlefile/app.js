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
var hyper = new Hyper(options || { port: 8002 });

// load config and routes
var app = hyper.start({
  routes: [
    {
      api:    '/hello',
      method: {
        get: function world ($done, $config, $logger) {
          $logger.log('hello world config:', $config);
          $done($config);
        }
      }
    }
  ]
});

// !-- FOR TESTS
module.exports = app;
// --!
