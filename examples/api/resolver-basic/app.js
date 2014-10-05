'use strict';

var hyper     = require('../../../index.js');
var authBasic = require('hyper.io-express-auth-basic');

hyper().use(authBasic);

// Load's config files and start web server
hyper().start();
