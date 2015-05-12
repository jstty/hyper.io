'use strict';
var Hyper = require('../../../index.js');

// !-- FOR TESTS
var options = {};
try {
    options = JSON.parse(process.env.HYPER_OPTIONS);
} catch(err){}
// --!

// Load config and routes
var app = new Hyper(options);

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

// !-- FOR TESTS
module.exports = app;
// --!
