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

var app = hyper
    .start({
        preRoutes: function ($http, $logger)
        {
            $logger.log('Ran preRoutes');
            $http.app().use(function(req, res, next){
                $logger.log('custom test');
                next();
            });
        },
        routes: [
            {
                api: "/hello",
                method: {
                    get: function world($done)
                    {
                        $done( { hello: "world" } );
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
