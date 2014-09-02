'use strict';

/*
var Hapi = require('hapi');


// Create a server with a host and port
var server = new Hapi.Server('localhost', 8000);

// Add the route
server.route({
    method: 'GET',
    path: '/hello/{user}',
    handler: function (request, reply) {
        reply('Hello ' + request.params.user );
    }
});

var options = {
    console: {
        color: true,
        timestamp: 'YYYY-MM-DD HH:mm:ss Z',
        accessFormat: ':remote - - [:time] ":method :url HTTP/:http_ver" :status :length ":referer" ":agent" (:res_time)'
    }
};

server.pack.register({
    plugin: require('bucker'),
    options: options
}, function (err) {
    if (err) {
        console.log(err);
        return;
    }
});

// Start the server
server.start();
*/

var hyper = require('../../index.js');

// Load's config files
var app = hyper({
    configs: [
        '$config.js',           // framework dir (default)
        'config.app.js',        // current dir
        '~config.custom.js'     // home dir
    ]
});

// Start web server
app.start();
