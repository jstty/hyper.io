'use strict';

var hyper = require('../../index.js');

/*
 * Load's config files
 */
var app = hyper({
    configs: [
        '$config.js',           // framework dir
        'config.app.js',        // current dir
        '~config.custom.js'     // home dir
    ]
});

/*
 * Look in config.myapp.js for routes
 */


/*
 * Start web server
 */
app.start();
