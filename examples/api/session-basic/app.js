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
                // http://localhost:8000/login?username=joe
                api: "/login",
                method: {
                    get: function login($done, $session, $input)
                    {
                        $session.username = $input.query.username;
                        $done( {
                            hello: $session.username
                        } );
                    }
                }
            },
            {
                // http://localhost:8000/hello
                api: "/hello",
                method: {
                    get: function world($done, $session)
                    {
                        $done( {
                            hello: "world",
                            session: $session
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
