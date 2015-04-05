'use strict';
var Hyper = require('../../../../index.js');

// !-- FOR TESTS
var options = {};
try {
    options = JSON.parse(process.env.HYPER_OPTIONS);
} catch(err){}
// --!

// Load's config files
var hyper = new Hyper(options);

// load routes
var app = hyper.load({
    name:      "app",
    directory: "custom_path"
});

// !-- FOR TESTS
module.exports = app;
// --!
