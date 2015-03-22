'use strict';

var hyper = require('../../../index.js');

// load config and routes
var app = hyper();

app.load({
    routes: [{
        api: "/hello",
        method: {
            get: function world($done, hello)
            {
                hello.world()
                    .then(function(data){
                        $done(data);
                    });
            }
        }
    }]
});

app.resource('hello', require('./resource.hello.js'));

app.start();
