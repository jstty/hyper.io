'use strict';

var hyper = require('../../../index.js');

// load config and routes
var app = hyper();

app.load({
    services: {
        "s1": {
            routes: [{
                api: "/s1/hello",
                method: {
                    get: function world($done)
                    {
                        $done( { hello: new Date()} );
                    }
                }
            }]
        },
        "s2": {
            routes: [{
                api: "/s2/world",
                method: {
                    get: function world($done)
                    {
                        $done( { world: new Date()} );
                    }
                }
            }]
        }
    }
});

app.start();
