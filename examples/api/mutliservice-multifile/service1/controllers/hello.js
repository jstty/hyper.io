'use strict';

module.exports = HelloCtrl;

function HelloCtrl(){
}

// localhost:8000/service2/hello
HelloCtrl.prototype.world = function($done)
{
    $done( { source: "service1", hello: "world" } );
};
