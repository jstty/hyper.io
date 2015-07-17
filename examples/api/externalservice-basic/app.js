'use strict';
var Hyper = require('../../../index.js');
var freeport = require('freeport');

// !-- FOR TESTS
var options1 = {};
try {
    options1 = JSON.parse(process.env.HYPER_OPTIONS);
} catch(err){}
// --!

// load config and routes
var hyper1 = new Hyper(options1);

hyper1.load({
    services: {
        "service1": {
            routes: [{
                api: "/service1/hello",
                method: {
                    get: function hello($done, $services)
                    {
                        $services.find('service2')
                            .get('/service2/world', { query: { hello: 'world1'} })
                            .then(function(data){
                                $done( data );
                            });
                    }
                }
            }]
        },
        "service2": {
            routes: [{
                api: "/service2/hello",
                method: {
                    get: function hello($done, $services)
                    {
                        $services.find('service3')
                            .get('/service3/world', { query: { hello: 'world2'} } )
                            .then(function(data){
                                $done( data );
                            });
                    }
                }
            },
            {
                api: "/service2/world",
                method: {
                    get: function world($done, $logger, $input)
                    {
                        var data = {
                            hello2: $input.query.hello,
                            ts: new Date()
                        };
                        $logger.log('world2 data:', data);

                        $done( data );
                    }
                }
            }]
        }
    }
});

var app1 = hyper1.start();

freeport(function(err, port){
    // server3 options
    var options2 = {
        port: port,
        silent: true
    };

    hyper1.services().add({
        name:     'service3',
        adapter:  'http', // can be a object, for custom adapters
        options: {
            hostname: '127.0.0.1',
            port: options2.port
        }
    });

    // load config and routes
    var hyper2 = new Hyper(options2);

    hyper2.start({
        services: {
            "service3": {
                routes: [{
                    api: "/service3/world",
                    method: {
                        get: function hello($done, $input)
                        {
                            var data = {
                                hello3: $input.query.hello,
                                ts: new Date()
                            };
                            $done( data );
                        }
                    }
                }]
            }
        }
    });
});

// !-- FOR TESTS
module.exports = app1;
// --!
