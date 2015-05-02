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

// Load's config files
var app = hyper();

// Start web server
app.start();

// !-- FOR TESTS
module.exports = app;
// --!
