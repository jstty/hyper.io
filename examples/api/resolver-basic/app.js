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

var authBasic = require('hyper.io-express-auth-basic');

hyper.use(authBasic);

// Load's config files and start web server
hyper.start();

// !-- FOR TESTS
module.exports = hyper;
// --!
