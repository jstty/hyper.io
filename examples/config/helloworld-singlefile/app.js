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

var app = hyper();

// load config and routes
app.start({
    routes: [
        {
            api: "/hello",
            method: {
                get: function world($done, $config, $logger)
                {
                    $logger.log('hello world!');
                    $done( $config );
                }
            }
        }
    ]
});

// !-- FOR TESTS
module.exports = app;
// --!
