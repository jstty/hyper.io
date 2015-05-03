'use strict';

module.exports = EventCtrl;

function EventCtrl($logger){
    $logger.log('Event Ctrl Init');
}

// localhost:12003/ws/event/update
EventCtrl.prototype.update = function($done, $logger, $service, $input)
{
    // TODO: push message up web socket
    $logger.log('update - $input.query:', $input.query);
    $service.sendEvent($input.query);

    $done( { statusCode: 200 } );
};
