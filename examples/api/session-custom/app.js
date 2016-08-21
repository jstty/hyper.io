'use strict';
var Hyper   = require('../../../index.js');
var session = require('express-session');

// !-- FOR TESTS
var options = {};
try {
  options = JSON.parse(process.env.HYPER_OPTIONS);
}
catch (err) {}
// --!

// Load config and routes
options.session = {
  secret:            'keyboard kat',
  resave:            false,            // depends on the session store, see https://github.com/expressjs/session#resave
  saveUninitialized: false, // depends on several cases, see https://github.com/expressjs/session#saveuninitialized
  cookie:            {
        // secure: true, // enable only if https
    path:     '/',
    httpOnly: true,
    maxAge:   1000 * 60 * 24 // 24 hours
  },
  storeInst: new session.MemoryStore()
};
var hyper = new Hyper(options);

var app = hyper
    .start({
      routes: [
        {
                // http://localhost:8000/login?username=joe
          api:    '/login',
          method: {
            get: function login ($done, $session, $input) {
              $session.username = $input.query.username;
              $done({
                hello: $session.username
              });
            }
          }
        },
        {
                // http://localhost:8000/hello
          api:    '/hello',
          method: {
            get: function world ($done, $session) {
              $done({
                hello:   'world',
                session: $session
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
