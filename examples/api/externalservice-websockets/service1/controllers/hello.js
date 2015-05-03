'use strict';

module.exports = HelloCtrl;

function HelloCtrl($logger){
    $logger.log('Service 1 - Hello Ctrl Init');
}

// localhost:8000/service1/hello
HelloCtrl.prototype.hello = function($done, $services)
{
    $services.find('service2')
        .get('/service2/world', { query: { hello: 'service2'} })
        .then(function(data){
            $done( data );
        });
};
