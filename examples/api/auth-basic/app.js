'use strict';
var Hyper = require('../../../index.js');
var authBasic = require('hyper.io-express-auth-basic');

// !-- FOR TESTS
var options = {};
try {
    options = JSON.parse(process.env.HYPER_OPTIONS);
} catch(err){}
// --!

// Load config and routes
var hyper = new Hyper(options);

hyper.use(authBasic);

// load config and routes
var app = hyper.start({
    routes: [
        {
            api: "/hello",
            required: {
                'auth-basic': {
                    user: 'hello',
                    pass: 'world',
                    message: 'Login with user:"hello" pass:"world"'
                }
            },
            method: {
                get: function world($done)
                {
                    $done( { hello: "world" } );
                }
            }
        }
    ]
});


// !-- FOR TESTS
module.exports = app;
// --!
