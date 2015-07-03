'use strict';
var Hyper = require('../../../index.js');
var freeport = require('freeport');

// !-- FOR TESTS
var options1 = {};
try {
    options1 = JSON.parse(process.env.HYPER_OPTIONS);
} catch(err){}
// --!

// load config and routes
var hyper1 = new Hyper(options1);

// Load's config files
// Start web server
var app1 = hyper1.start(['service1', 'service2']);

freeport(function(err, port) {
    // server3 options
    var options2 = {
        port: port,
        silent: true
    };

    hyper1.services().add({
        name: 'wsService',
        adapter: 'http', // can be a object, for custom adapters
        options: {
            hostname: 'localhost',
            port: options2.port
        }
    });

    // load config and routes
    var hyper2 = new Hyper(options2);
    hyper2.start(['wsService']);
});

// !-- FOR TESTS
module.exports = app1;
// --!
