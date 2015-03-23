'use strict';

var hyper = require('../../../index.js');

// load config and routes
hyper().start({
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
