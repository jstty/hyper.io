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

// load routes
hyper.start({
    routes: [
        {
            view: "/hello",
            template: "hello <%= hello %> - <%= ts %>",
            method: {
                get: function world($done)
                {
                    $done( {
                        hello: "world",
                        ts: new Date()
                    } );
                }
            }
        }
    ]
});

// !-- FOR TESTS
module.exports = app;
// --!
