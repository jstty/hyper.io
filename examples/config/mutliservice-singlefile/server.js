'use strict';

var hyper = require('../../../index.js');

// load config and routes
var app = hyper();

app.start({
    services: {
        "service1": {
            routes: [{
                api: "/service1/hello",
                method: {
                    get: function hello($done, $config)
                    {
                        $done( { "source":"service1", "ts": new Date(), config: $config } );
                    }
                }
            }]
        },
        "service2": {
            routes: [{
                api: "/service2/hello",
                method: {
                    get: function hello($done, $config)
                    {
                        $done( { "source":"service2", "ts": new Date(), config: $config } );
                    }
                }
            }]
        }
    }
});
