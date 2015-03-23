'use strict';

var hyper = require('../../../index.js');

// Load's config files
var app = hyper();

// Start web server
app.start(['service1', 'service2']);
