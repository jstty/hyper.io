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
          api:    '/hello',
          method: {
            get: function helloGet ($done, $input) {
              $done({
                hello: $input.query
              });
            },
            post: function helloPost ($done, $input) {
              $done({
                hello: $input.body
              });
            }
          }
        },
        {
          api:    '/world/:worldName',
          method: {
            get: function world ($done, $input) {
              $done({
                world: $input.params.worldName
              });
            }
          }
        }
      ]
    }).then(function (server) {
      server.logger().log('Server Started');
      return server;
    });

// !-- FOR TESTS
module.exports = app;
// --!
