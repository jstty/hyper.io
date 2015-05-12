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
var ServiceRouter  = require('./router.service.js');
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
    this._servicesConfig = {};
    this._isLoaded       = false;

    // set logger
    logger = util.logger("HyperCore");

    // ------------------------------
    // normalize options
    this._options = this._normalizeOptions(this._options);
    //logger.log('options:', JSON.stringify(this._options, null, 2));
    // ------------------------------

    // middleware manager
    this._middleware = new Middleware();

    // add catch all, just in case
    process.on('uncaughtException', function(err) {
        logger.error("Uncaught Error -", err, ", stack:", err.stack);
    });
}

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

// load services
// return promise
Hyper.prototype.load = function(servicesConfig) {
    this._isLoaded = true;

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

    // load HTTP framework
    if(this._config.hyper.httpFramework === 'express') {
        // TODO: use DI to pass vars
        this._httpFramework = new HttpFramework_Express(this._config.httpFramework, this._stats);
    } else {
        logger.error("Uncaught Error -", err, ", stack:", err.stack);
        return;
    }

    this._httpServer = http.Server( this._httpFramework.app() );

    // load default middleware
    this._loadDefaultMiddleware();

    // normalize config, adding service config
    this._servicesConfig = this._normalizeServicesConfig(servicesConfig);
    if(this._displayDebuggerInfo) {
        logger.info('servicesConfig:', JSON.stringify(this._servicesConfig, null, 2));
    }

    this._serviceRouter = new ServiceRouter({
        port:     this._httpFramework.port(),
        protocol: this._httpFramework.protocol()
    });

    // service manager
    this._serviceManager = new ServiceManager(this._config.serviceManager, this._servicesConfig, this._middleware, this._serviceRouter, this);
    this._serviceManager.setHttpFramework(this._httpFramework);

    return this._serviceManager
        .load()
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

Hyper.prototype.start = function(servicesConfig) {
    if(this._isLoaded) {
        logger.log('---------------------------------------------');
        return this.httpServerListen()
            .then(function(){
                return this;
            }.bind(this));
    } else {
        return this.load(servicesConfig)
            .then(function(){
                logger.log('---------------------------------------------');
                return this.httpServerListen()
                    .then(function(){
                        return this;
                    }.bind(this));
            }.bind(this));
    }
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
    return this._serviceRouter;
};


Hyper.prototype._loadDefaultMiddleware = function() {
    this._middleware.use('template', 'hyper.io-ejs');
};

Hyper.prototype._normalizeServicesConfig = function(servicesConfig) {
    // make sure config is object
    if (!servicesConfig) {
        servicesConfig = {};
    }

    // get default name from file
    var defaultAppName = this._config.appName || this._defaultAppName;
    if (_.isString(servicesConfig)) {
        defaultAppName = servicesConfig;
        servicesConfig = {};
    }

    // if array
    if (_.isArray(servicesConfig)) {
        var tmp = servicesConfig;

        servicesConfig = {};
        servicesConfig.services = {};

        for (var i = 0; i < tmp.length; i++) {
            var appName = defaultAppName + i;

            if (_.isString(tmp[i])) {
                appName = tmp[i];

                servicesConfig.services[appName] = {
                    // default dir, same as service name
                    directory: appName
                };
            }

            if (_.isObject(tmp[i])) {
                if (tmp[i].hasOwnProperty('name')) {
                    appName = tmp[i].name;
                }

                servicesConfig.services[appName] = tmp[i];

                // if no dir, same as service name
                if (!servicesConfig.services[appName].hasOwnProperty('directory')) {
                    servicesConfig.services[appName].directory = appName;
                }
            }

            // check if servicesConfig[appName].directory exists
            if (!fs.existsSync(servicesConfig.services[appName].directory)) {
                // TODO: try to find service dir
                logger.error("Could not find service directory:", servicesConfig.services[appName].directory);
                return;
            }

            // if config does not contain routes
            // try to load a routes file using app name
            if (!servicesConfig.services[appName].hasOwnProperty('routes')) {
                try {
                    // use directory as root to look for routes file
                    var fileSearchPath =
                        path.resolve(process.cwd(), servicesConfig.services[appName].directory)
                        + path.sep + '**' + path.sep
                        + appName + '.routes.js';
                    var globs = glob.sync(fileSearchPath);

                    // remove all node_modules
                    globs = util.filterNodeModules(globs);

                    if (globs.length == 0) {
                        logger.info("Could not find a routes files and service defined (%s)", fileSearchPath);
                    }
                    else if (globs.length > 1) {
                        logger.warn("More than one route file found", globs);
                    }

                    if (globs.length == 1) {
                        var file = path.resolve(globs[0]);
                        servicesConfig.services[appName].routes = require(file);
                    }
                } catch (err) {
                    logger.error("Could not load routes files.", err);
                    return;
                }
            }
        }
    }

    if ( _.isObject(servicesConfig) &&
        servicesConfig.hasOwnProperty('name')) {
        defaultAppName = servicesConfig.name;
    }

    if (!servicesConfig.hasOwnProperty('services')) {
        servicesConfig.services = {};

        // TODO: find services
        // ensure serviceConfig has an object with app name
        servicesConfig.services[defaultAppName] = {
            // default lib dir
            directory: "lib"
        };

        if (servicesConfig.hasOwnProperty('directory')) {
            // move routes to in service app object
            servicesConfig.services[defaultAppName].directory = servicesConfig.directory;
            delete servicesConfig.directory;
        }

        // check if servicesConfig[appName].directory exists
        if (!fs.existsSync(servicesConfig.services[defaultAppName].directory)) {
            // if not, set to current working dir
            servicesConfig.services[defaultAppName].directory = process.cwd();
        }

        // if config does not contain routes
        // try to load a routes file using app name
        if (!servicesConfig.hasOwnProperty('routes')) {
            try {
                // use directory as root to look for routes file
                var fileSearchPath =
                    path.resolve(process.cwd(), servicesConfig.services[defaultAppName].directory)
                    + path.sep + '**' + path.sep
                    + defaultAppName + '.routes.js';
                var globs = glob.sync(fileSearchPath);

                // remove all node_modules
                globs = util.filterNodeModules(globs);

                if (globs.length == 0) {
                    logger.info("Could not find a routes files and service defined (%s)", fileSearchPath);
                }
                else if (globs.length > 1) {
                    logger.warn("More than one route file found", globs);
                }

                if(globs.length == 1) {
                    var file = path.resolve(globs[0]);
                    servicesConfig.services[defaultAppName].routes = require(file);
                }
            } catch (err) {
                logger.error("Could not load routes files.", err);
                return;
            }
        } else {
            // move routes to in service object
            servicesConfig.services[defaultAppName].routes = servicesConfig.routes;
            delete servicesConfig.routes;
        }

    } else {
        // check each service
        _.forEach(this._servicesConfig, function (service, key) {
            // check if directory and routes exist, if not then error
            if (!service.hasOwnProperty('routes')) {
                logger.error("Could not find a routes in service:", key);
                return;
            }

            if (!service.hasOwnProperty('directory')) {
                logger.warn("Could not find a directory defined in service:", key, ", defaulting to service name");
                service.directory = key;
            }
        }.bind(this));
    }

    for (var key in servicesConfig.services) {
        if(!servicesConfig.services[key].hasOwnProperty('config')) {
            var config = this._config;

            // config has app name
            if(config.hasOwnProperty(defaultAppName)) {
                config = config[defaultAppName];
            }
            if(config.hasOwnProperty('services')) {
                config = config['services'];
            }

            // config has service name/id
            if(config.hasOwnProperty(key)) {
                servicesConfig.services[key].config = config[key];
            }
            else {
                servicesConfig.services[key].config = config;
            }
        }
    }


    return servicesConfig;
};
