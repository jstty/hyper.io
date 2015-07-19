'use strict';

/*
 *
 */
var fs         = require('fs');
var path       = require('path');
var http       = require('http');

var _          = require('lodash');
var glob       = require('glob');
var transfuser = require('transfuser');
var when       = require('when');
//
var HttpFramework_Express = require('./http.framework.express.js');
//
var Middleware     = require('./manager.middleware.js');
var ServiceManager = require('./manager.service.js');
var util           = require('./util.js');

//
var logger = null;
// for singleton behavior, single instance of hyper globally
var _hyper = null;

module.exports = Hyper;

/*
 // TODO: option for verbosity of warnings/info/errors
 //     default silent all info/warnings

 // TODO: add "status code" rules to routes
 error: {
    '40x': {
        redirect: {
            to: "/"
        }
    }
 }

 */

function Hyper(options) {
    if(!(this instanceof Hyper)) {
        // singleton behavior
        if(!_hyper) {
            _hyper = new Hyper(options);
        }
        return _hyper;
    }

    // default options
    if(!options) {
        options = {};
    }

    this._displayDebuggerInfo = options.displayDebuggerInfo || false;

    // default
    var configs = [
        '$/config.json',  // framework dir (default)
        '$/config.js'     // framework dir (default)
    ];

    // get server filename
    this._defaultAppName = options.appName || path.basename(require.main.filename, '.js');

    configs.push('config.json'); // current dir
    configs.push('config.js');   // current dir
    configs.push(this._defaultAppName+'.config.json'); // current dir
    configs.push(this._defaultAppName+'.config.js');   // current dir

    configs.push('~/config.custom.json'); // home dir
    configs.push('~/config.custom.js');   // home dir
    configs.push('~/'+this._defaultAppName+'.config.custom.json'); // home dir
    configs.push('~/'+this._defaultAppName+'.config.custom.js'); // home dir

    this._options = _.merge({
        configs: configs
    }, options);

    // TODO: add stats
    this._stats          = null;
    this._httpFramework  = null;
    this._httpServer     = null;
    this._servicesManifest = {};
    this._isLoaded       = false;

    // set logger
    logger = util.logger("HyperCore");

    // ------------------------------
    // normalize options
    this._options = this._normalizeOptions(this._options);
    //logger.info('options:', JSON.stringify(this._options, null, 2));
    // ------------------------------

    // middleware manager
    this._middleware = new Middleware();

    // add catch all, just in case
    process.on('uncaughtException', function(err) {
        logger.error("Uncaught Error -", err, ", stack:", err.stack);
    });
}

Hyper.prototype.env = function(env) {
    if(env) {
        this._options.serviceManager.env = env;
        this._options.httpFramework.env = env;
    }

    return this._options.serviceManager.env;
};

Hyper.prototype._normalizeOptions = function(options) {
    options = _.merge({
        serviceManager: {
            env: 'dev',
            silent: false,
            displayDebuggerInfo: false
        },
        httpFramework: {
            env: 'dev',
            port: 8000,
            silent: false,
            displayDebuggerInfo: false
        },
        hyper: {
            displayDebuggerInfo: false
        }
    }, options);

    if( options.env ) {
        options.serviceManager.env = options.env;
        options.httpFramework.env = options.env;
        delete options.env;
    }
    if( options.port ) {
        options.httpFramework.port = options.port;
        delete options.port;
    }
    if( options.session ) {
        options.httpFramework.session = options.session;
        delete options.session;
    }
    if(options.hasOwnProperty('displayDebuggerInfo')) {
        options.hyper.displayDebuggerInfo = options.displayDebuggerInfo;
        options.httpFramework.displayDebuggerInfo = options.displayDebuggerInfo;
        options.serviceManager.displayDebuggerInfo = options.displayDebuggerInfo;
        delete options.displayDebuggerInfo;
    }
    if( options.silent) {
        options.httpFramework.silent = true;
        options.serviceManager.silent = true;
        delete options.silent;

        logger.setEnv('prod');
    }

    return options;
};

Hyper.prototype.logger = function() {
    return util.logger();
};

Hyper.prototype.resource = function(name, resourceModule) {
    this._serviceManager.addResource(name, resourceModule);
};

Hyper.prototype._loadConfigs = function(servicesManifest){
    // config manager
    // logger not loaded, yet so we can only user console
    logger.log('---------------------------------------------');
    logger.group('Loading Configuration...');
    this._configManager = new transfuser({
        basePath: __dirname,
        logger:  logger
    });
    // blocking, but this is ok because the server needs the configs to proceed
    this._config = this._configManager.loadSync(this._options.configs, !this._displayDebuggerInfo);
    // normalize configs
    this._config = this._normalizeOptions(this._config);
    logger.groupEnd("");

    // add options passed in from inits
    this._config.appName        = this._options.appName;
    this._config.hyper          = _.merge(this._config.hyper,          this._options.hyper);
    this._config.serviceManager = _.merge(this._config.serviceManager, this._options.serviceManager);
    this._config.httpFramework  = _.merge(this._config.httpFramework,  this._options.httpFramework);
    //logger.log('config:', JSON.stringify(this._config, null, 2));

    //
    if(this._config.hyper.hasOwnProperty('displayDebuggerInfo')) {
        this._displayDebuggerInfo = this._config.hyper.displayDebuggerInfo;
    }

    // update logger options, using config
    logger.setOptions(this._config.hyper.logger);


    // service config
    this._servicesManifest = servicesManifest;
};


// load services
// return promise
Hyper.prototype.load = function(servicesManifest) {
    this._isLoaded = true;

    this._loadConfigs(servicesManifest);

    this._initHttpFramework();
    // load default middleware
    this._loadDefaultMiddleware();

    // init service manager and router
    this._initServiceManager();

    return this._serviceManager.loadHttpFramework()
        .then(function(){
            return this;
        }.bind(this));
};


Hyper.prototype.httpServerListen = function() {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    this._httpServer.listen(this._httpFramework.port(), function () {
        logger.log('Listening on port %d', this._httpFramework.port());
        resolve();
    }.bind(this));

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

// load all services and then start
Hyper.prototype._start = function() {
    return this._serviceManager.loadServices()
        .then(function(){
            return this.httpServerListen();
        }.bind(this))
        .then(function(){
          return this._serviceManager.postStartInit();
        }.bind(this))
        .then(function(){
            logger.log('---------------------------------------------');
            logger.log('Ready to accept connections on port', this._httpFramework.port());
            logger.log('---------------------------------------------');
            return this;
        }.bind(this));
};

Hyper.prototype.start = function(servicesManifest) {
    if(this._isLoaded) {
        logger.log('---------------------------------------------');
        return this._start();
    } else {
        return this.load(servicesManifest)
            .then(function(){
                logger.log('---------------------------------------------');
                return this._start();
            }.bind(this));
    }
};

Hyper.prototype.stop = function() {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    this._httpServer.close();
    resolve();

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

Hyper.prototype.use = function(MiddlewareGroup, MiddlewareName, option) {
    this._middleware.use(MiddlewareGroup, MiddlewareName, option);
};


Hyper.prototype.httpFramework = function() {
    return this._httpFramework;
};

Hyper.prototype.httpServer = function() {
    return this._httpServer;
};

Hyper.prototype.services = function() {
    return this._serviceManager.getServiceRouter();
};



Hyper.prototype._initHttpFramework = function() {
    // load HTTP framework
    if(this._config.hyper.httpFramework === 'express') {
        // TODO: use DI to pass vars
        this._httpFramework = new HttpFramework_Express(this._config.httpFramework, this._stats);
    } else {
        logger.error("Uncaught Error -", err, ", stack:", err.stack);
        return;
    }

    this._httpServer = http.Server( this._httpFramework.app() );
};

Hyper.prototype._initServiceManager = function() {
    // service manager
    this._serviceManager = new ServiceManager(this, this._config, this._servicesManifest, this._middleware, this._httpFramework, this._defaultAppName);
};


Hyper.prototype._loadDefaultMiddleware = function() {
    this._middleware.use('template', 'hyper.io-ejs');
};
