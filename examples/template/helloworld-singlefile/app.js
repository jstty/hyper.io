'use strict';

var hyper = require('../../../index.js');

// Load's config files
var app = hyper();

// load routes
app.load({
    routes: [
        {
            view: "/hello",
            template: "hello {{ hello }} - {{ ts }}",
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
}).then(function(){
    // done loading
    // Start web server
    return  app.start();
}).then(function(){
    console.log("Server Started");
});
