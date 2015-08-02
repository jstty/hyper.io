'use strict';
var Hyper = require('../../../index.js');

// !-- FOR TESTS
var options = {};
try {
    options = JSON.parse(process.env.HYPER_OPTIONS);
} catch(err){}
// --!

// load config and routes
var hyper = new Hyper(options);

hyper.use('hyper.io-express-auth-basic');

// Load's config files and start web server
var app = hyper.start();

// !-- FOR TESTS
module.exports = app;
// --!
