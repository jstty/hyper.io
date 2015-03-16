'use strict';

var hyper = require('../../../index.js');

// load config and routes
hyper().load({
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
}).then(function(app){
    // done loading
    // Start web server
    return  app.start();
}).then(function(){
    console.log("Server Started");
});
