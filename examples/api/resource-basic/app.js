'use strict';

var hyper = require('../../../index.js');

// load config and routes
var app = hyper();

app.load({
    routes: [{
        api: "/hello",
        method: {
            get: function world($done, hello)
            {
                $done( hello.world() );
            }
        }
    }]
});

app.resource('hello', require('./resource.hello.js'));

app.start();
