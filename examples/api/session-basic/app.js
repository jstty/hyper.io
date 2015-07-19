'use strict';
var Hyper = require('../../../index.js');

// !-- FOR TESTS
var options = {};
try {
    options = JSON.parse(process.env.HYPER_OPTIONS);
} catch(err){}
// --!

// Load config and routes
options.session = true;
var hyper = new Hyper(options);

var app = hyper
    .start({
        routes: [
            {
                api: "/hello",
                method: {
                    get: function world($done, $session, $logger)
                    {
                        $done( {
                            hello: "world",
                            cookie: $session.cookie
                        } );
                    }
                }
            }
        ]
    }).then(function(server){
        server.logger().log("Server Started");
        return server;
    });


// !-- FOR TESTS
module.exports = app;
// --!
