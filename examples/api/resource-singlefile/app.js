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

// load config and routes
var app = hyper();

// setup routes
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
// OR
// app.resource('hello', './resource.hello.js');
// OR
// app.resource('hello');

app.start();

// !-- FOR TESTS
module.exports = app;
// --!
