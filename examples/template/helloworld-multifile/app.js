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

// Start web server
var app = hyper.start();

// state will auto load all files
// default app name is 'app'
// Hyper will load the following:
//     /app.routes.js
//     /controllers/hello.js
//     /views/hello.ejs
//

// !-- FOR TESTS
module.exports = app;
// --!
