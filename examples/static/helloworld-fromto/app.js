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


var staticRoute1 = [
    "app/main",
    {
        from: "app/css/main1.css",
        to:   "main.css"
    }
];

var staticRoute2 = {
    root: "app",
    list: [
        {
            from: "main",
            to:   "/hello"
        },
        {
            from: "css/main2.css",
            to:   "/hello/main.css"
        }
    ]
};

var app = hyper
    .start({
        routes: [
            {
                static: staticRoute1
            },
            {
                static: staticRoute2
            }
        ]
    }).then(function(server){
        server.logger().log("Server Started");
        return server;
    });

// !-- FOR TESTS
module.exports = app;
// --!
