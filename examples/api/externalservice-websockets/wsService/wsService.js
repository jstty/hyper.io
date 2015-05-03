
module.exports = wsService;

var logger = null;
var socket = require('socket.io');

function wsService($logger, $hyper){
    logger = $logger;
    $logger.log('Init');

    // init socket.io
    this.io = socket( $hyper.httpServer() );
    this._connections = [];

    this.io.on('connection', function (socket) {
        this._connections.push(socket);
    }.bind(this));

    // Add headers so client can connect to this service
    $hyper.httpFramework()
        .app()
        .use(function (req, res, next) {
            res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8000');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
            res.setHeader('Access-Control-Allow-Credentials', true);
            next();
        });
}

wsService.prototype.sendEvent = function(event) {
    event.ts1 = parseInt(event.ts1);
    event.ts2 = (new Date()).getTime();
    event.tsDiff = event.ts2 - event.ts1;
    //logger.log('sendEvent:', event);

    for(var i = 0; i < this._connections.length; i++) {
        this._connections[i].emit('event', event);
    }
};
