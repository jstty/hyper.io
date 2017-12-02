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

// var ejs = require('hyper.io-ejs');
// hyper.use(ejs);

// load routes
var app = hyper.start({
  routes: [
    {
      view:     '/hello',
      template: 'hello <%= hello %> - <%= ts %>',
      method:   {
        get: function world ($done) {
          $done({
            hello: 'world',
            ts:    Date.now()
          });
        }
      }
    }
  ]
});

// !-- FOR TESTS
module.exports = app;
// --!
