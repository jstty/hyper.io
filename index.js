'use strict';

/*
 * Features:
 *      Config manager
 *      Service based architecture
 *      API/View route management for easy API docs
 */

/*
 * Request Flow:
 *      Express(HTTP Server -> Parser) -> Service Manager( [Resolvers] -> Controller End Point -> [View] )
 */

/*
 * TODO:
 *      DI variables into resolver, service, controller
 *      Custom output error format, defined in config
 *      define resolvers
 *      statsD hooks
 *
 *      sessions service
 *      passport auth service
 *      auth resolver
 *      basic auth resolver
 *
 *      abstract express so it be easily replaced
 *
 */

var _              = require('lodash');

var express        = require('express');
var compress       = require('compression');
var cookieParser   = require('cookie-parser');
var errorHandler   = require('errorhandler');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');

var logz           = require('logz-js');
var configz        = require('configz');

var ServiceManager = require('./lib/manager.service.js');
var util           = require('./lib/util.js');

module.exports = Framework;

function Framework(options) {
    if(!(this instanceof Framework)) {
        return new Framework(options);
    }

    this._options = _.merge({

    }, options);


    // config manager
    console.log('---------------------------------------------');
    console.log('Loading Configuration...');
    this._configManager = new configz({
        basePath: __dirname
    });
    this._config = this._configManager.loadSync(options.configs);
    //console.log("config", JSON.stringify(this._config, null, 2));

    //
    this._app = express();
    this._app.set('port', process.env.PORT || this._options.port || 8000);

    this._app.use(util.GetExpressLogger());
    // TODO: only in dev
    this._app.use(errorHandler({showStack: true, dumpExceptions: true}));

    this._app.use(compress());
    this._app.use(cookieParser());
    this._app.use(bodyParser());
    this._app.use(methodOverride());

    // TODO: sessions
    /*
    this._app.use(express.session({
        secret: this.options.auth.secret,
        cookie: {
            path: '/'
            , httpOnly : false
            //, maxAge: 1000 * 60 * 24 // 24 hours
            //, domain: this.options.auth.host+":"+this.options.frontend.port
        },
        store:  this.exsStore
    }));
    */

    // service manager
    this._serviceManager = new ServiceManager(this._config);
    this._serviceManager.load(this._app);

    process.on('uncaughtException', function(err) {
        console.error("Framework: Uncaught Error -", err, ", stack:", err.stack);
    });
}




Framework.prototype.start = function() {
    this._server = this._app.listen(this._app.get('port'), function() {
        console.log('Listening on port %d', this._server.address().port);
    }.bind(this));
};

