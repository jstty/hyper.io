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

//
function authJWT (_config) {
  this._config = _config;
  this.handles = ['authRequired', 'authLogin'];
}

authJWT.prototype.init = function (_logger, _httpFramework, _middleware, _serviceManager) {
  this._logger = _logger;
  this._serviceManager = _serviceManager;
  this._middleware = _middleware;
  this._httpFramework = _httpFramework;

  this._secret = 'keyboard cat';

  this._jwt = require('jsonwebtoken');
};

authJWT.prototype.setup = function (handleKey, defaultConfig, service, controller, route) {
  var method = null;
  var func = null;

  function getToken (req) {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      return req.headers.authorization.split(' ')[1];
    }
    else if (req.query && req.query.token) {
      return req.query.token;
    }
    return null;
  }

  if (route.hasOwnProperty('api') &&
        handleKey === 'authLogin' &&
        defaultConfig === true) {
    this._logger.log('Enable Auth Login for Route:', route.api);

    if (!route.resolve) {
      route.resolve = {};
    }

        // TODO: needs to be a factory instead of value DI
        // authData should be instance per request
    var authData = {
      user:          {},
      authenticated: false
    };
    route.resolve['$auth'] = function () {
      return authData;
    };

    for (method in route.method) {
      func = route.method[method];

            // TODO: needs to make this generic (NOT express specific)
      this._httpFramework.app()[method](
                route.api,
                func,
                function (req, res, next) {
                  var token = this._jwt.sign(authData, this._secret, {
                    expiresIn: 60 * 60 * 5
                  });

                  res.json({
                    token: token
                  });
                }.bind(this)
            );
    }
  }
  else if (route.hasOwnProperty('api') &&
        handleKey === 'authRequired' &&
        defaultConfig === true) {
    this._logger.log('Enable Auth for Route:', route.api);

    for (method in route.method) {
      func = route.method[method];

            // TODO: needs to make this generic (NOT express specific)
      this._httpFramework.app()[method](
                route.api,
                function (req, res, next) {
                  console.log('auth before');
                    // TODO validate token

                  var token = getToken(req);
                  if (token !== null) {
                    this._jwt.verify(token, this._secret, function (err, decoded) {
                      if (!err) {
                                // TODO decode data should set the DI auth value for the next
                                // TODO DI breaks here
                        func(req, res, next);
                      }
                      else {
                        res.end('invalid token');
                      }
                    });
                  }
                  else {
                    res.end('error');
                  }
                }.bind(this)
            );
    }
  }
};

hyper.middleware(authJWT, {secret: 'keyboard kat'});

// load config and routes
var app = hyper.start({
  routes: [
    {
      api:          '/secure',
      authRequired: true,
      method:       {
        get: function secure (req, res, next, $done) {
          // TODO DI is not passing through need to fix this
          // $done( { secure: "world" } );
          res.json({ secure: 'world' });
        }
      }
    },
    {
      api:       '/login',
      authLogin: true,
      method:    {
        post: function login ($input, $auth, $next, $error) {
          if ($input.body.user === 'test' &&
                        $input.body.pass === '123') {
            $auth.authenticated = true;
            $auth.user = {
              group: 'admin'
            };

                        // TODO fix this, the data should flow down the pipeline
            $next();
          }
          else {
            $error({ 'error': 'invalid user/pass' });
          }
        }
      }
    },
    {
      api:    '/hello',
      method: {
        get: function hello ($done) {
          $done({ notSecret: 'hello' });
        }
      }
    }
  ]
});

// !-- FOR TESTS
module.exports = app;
// --!
