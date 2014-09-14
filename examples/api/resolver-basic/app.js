'use strict';

var hyper = require('../../../index.js');

// Load's config files
var app = hyper();

/*
 // TODO: add plugin system
 // default
 app.plugin('logger', 'stumpy');
 app.plugin('configs', 'configz');
 app.plugin('monitor', 'statsd');

 app.plugin('template', 'handlebars');
 app.plugin('template', 'ejs');
 app.plugin('default', 'template', 'handlebars'); // set default

 app.plugin('route', 'auth-basic');
*/

/*
  // added to 'app'(default) service
  app.resource('mongodb');
*/

// Start web server
app.start();
