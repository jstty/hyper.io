'use strict';
var Hyper = require('../../../index.js');

// !-- FOR TESTS
var options = {};
try {
    options = JSON.parse(process.env.HYPER_OPTIONS);
} catch(err){}
// --!


// Load's config files then
// Start web server
var hyper = new Hyper(options);
var app = hyper.start(
    require('./external-service')
);


// !-- FOR TESTS
module.exports = app;
// --!
