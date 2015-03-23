'use strict';

var hyper = require('../../../../index.js');

// Load's config files
var app = hyper();

// load routes
app.load({
    name:      "app",
    directory: "custom_path"
}).then(function(){
    // done loading
    // Start web server
    return app.start();
}).then(function(){
    console.log("Server Started");
});
