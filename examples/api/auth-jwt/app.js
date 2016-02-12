'use strict';
var Hyper = require('../../../index.js');

// !-- FOR TESTS
var options = {};
try {
    options = JSON.parse(process.env.HYPER_OPTIONS);
} catch(err){}
// --!

// Load config and routes
var hyper = new Hyper(options);

function authJWT(_config) {
    this._config = _config;
    this.handles = ['authRequired'];
}

authJWT.prototype.init = function(_logger, _httpFramework, _middleware, _serviceManager) {
    this._logger = _logger;
    this._serviceManager = _serviceManager;
    this._middleware     = _middleware;
    this._httpFramework  = _httpFramework;

    this._jwt = require('express-jwt');
};

authJWT.prototype.setup = function(handleKey, defaultConfig, service, controller, route) {
    if( route.hasOwnProperty('api') &&
        handleKey === 'authRequired' &&
        defaultConfig === true) {
        this._logger.log('Enable Auth for Route:', route.api);

        for(var method in route.method) {
            var func = route.method[method];

            // TODO: this needs to be cleaner
            this._httpFramework.app()[method](
                route.api,
                this._jwt(this._config),
                func);
        }
    }
};

hyper.middleware(authJWT, {secret: 'keyboard kat'} );

// load config and routes
var app = hyper.start({
    routes: [
        {
            api: "/secure",
            authRequired: true,
            method: {
                get: function secure($done)
                {
                    $done( { secure: "123" } );
                }
            }
        },
        {
            api: "/login",
            authRequired: false,
            method: {
                post: function login($input, $auth)
                {
                    if( $input.body.user === 'test' &&
                        $input.body.pass === '123' ) {
                        $auth.user = {
                            admin: true
                        };
                        $auth.done( { login: "ok" } );
                    } else {
                        $auth.error( { login: "fail" } )
                    }
                }
            }
        },
        {
            api: "/hello",
            method: {
                get: function hello($done)
                {
                    $done( { hello: "world" } );
                }
            }
        }
    ]
});


// !-- FOR TESTS
module.exports = app;
// --!
