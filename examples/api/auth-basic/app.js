'use strict';

var hyper = require('../../../index.js');
var authBasic = require('hyper.io-express-auth-basic');

hyper().use(authBasic);

// load config and routes
hyper().start({
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
