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

// setup routes
hyper.load({
  routes: [{
    api:    '/hello',
    method: {
      get: function world ($done, hello) {
        $done(hello.world());
      }
    }
  }]
});

hyper.resource('hello', require('./resource.hello.js'));
// OR
// app.resource('hello', './resource.hello.js');
// OR
// app.resource('hello');

var app = hyper.start();

// !-- FOR TESTS
module.exports = app;
// --!
