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
            get: function* world ($done, $q) {
              var deferer = $q.defer();
              setTimeout(function () {
                deferer.resolve({ hello: 'world' });
              }, 500);

              var data = yield deferer.promise;

              // $done( data );
              // OR
              return data;
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
