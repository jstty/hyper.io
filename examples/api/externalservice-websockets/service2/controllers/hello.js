'use strict';

module.exports = HelloCtrl;

function HelloCtrl($logger){
    $logger.log('Service 2 - Hello Ctrl Init');
}

// localhost:8000/service2/hello
HelloCtrl.prototype.hello = function($done, $services)
{
    // send message to WebSocket service
    $services.find('wsService')
        .get('/ws/event/update', { query: { hello: 'wsService', ts1: (new Date()).getTime()} } )
        .then(function(data){
            $done( JSON.parse(data) );
        });
};

// localhost:8000/service2/world
HelloCtrl.prototype.world = function($done, $input)
{
    var data = {
        hello2: $input.query.hello,
        ts: new Date()
    };

    $done( data );
};
