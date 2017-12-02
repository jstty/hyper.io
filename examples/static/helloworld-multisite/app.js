'use strict';
var Hyper = require('../../../index.js');

// !-- FOR TESTS
var options = {};
try {
  options = JSON.parse(process.env.HYPER_OPTIONS);
}
catch (err) {}
// --!

// Load config and routes
var hyper = new Hyper(options);

var app = hyper
    .start({
      routes: [
        {
          static: [
            {
              from: 'site1',
              to:   '/hello'
            },
            {
              from: 'site2',
              to:   '/world',
              default: 'site2/index.html'
            }
          ]
        }
      ]
    }).then(function (server) {
      server.logger().log('Server Started');
      return server;
    });

// !-- FOR TESTS
module.exports = app;
// --!
