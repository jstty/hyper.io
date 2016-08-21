'use strict';
var Hyper = require('../../../index.js');

// !-- FOR TESTS
var options = {};
try {
  options = JSON.parse(process.env.HYPER_OPTIONS);
}
catch (err) {}
// --!

// load config and routes
var hyper = new Hyper(options);

hyper.load({
  routes: [{
    api:    '/hello',
    method: {
      get: function world ($done, hello) {
        hello.world()
          .then(function (data) {
            $done(data);
          });
      }
    }
  }]
});

hyper.resource('hello', require('./resource.hello.js'));

var app = hyper.start();

// !-- FOR TESTS
module.exports = app;
// --!
