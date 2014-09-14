'use strict';

var hyper = require('../../../index.js');

// Load's config files
var app = hyper();

// Start web server
app.start();

// state will auto load all files
// default app name is 'app'
// Hyper will load the following:
//     /app.routes.js
//     /controllers/hello.js
//     /views/hello.ejs
//