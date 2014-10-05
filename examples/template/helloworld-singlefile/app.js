'use strict';

var hyper = require('../../../index.js');

// load routes
hyper().start({
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
