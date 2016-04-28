'use strict';

module.exports = HelloCtrl;

function HelloCtrl($logger, $config){
    $logger.log('Hello Ctrl - config:', $config);
}

// localhost:8000/hello
HelloCtrl.prototype.world = function($done, $logger, $config)
{
    $logger.log('Hello World Handler - config:', $config);
    $done( $config );
};
