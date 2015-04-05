'use strict';
var Hyper = require('../../../index.js');

// !-- FOR TESTS
var options = {};
try {
    options = JSON.parse(process.env.HYPER_OPTIONS);
} catch(err){}
// --!

// load config and routes
var hyper = new Hyper(options);

var app = hyper.start({
    services: {
        "s1": {
            routes: [{
                api: "/service1/hello",
                method: {
                    get: function hello($done)
                    {
                        $done( { hello: "world", ts: new Date()} );
                    }
                }
            }]
        },
        "s2": {
            routes: [{
                api: "/service2/hello",
                method: {
                    get: function hello($done)
                    {
                        $done( { hello: "world", ts: new Date()} );
                    }
                }
            }]
        }
    }
});

// !-- FOR TESTS
module.exports = app;
// --!
