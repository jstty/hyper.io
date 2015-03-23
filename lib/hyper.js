'use strict';

/*
 * 
 */
var fs         = require('fs');
var path       = require('path');
var _          = require('lodash');
var glob       = require('glob');
var transfuser = require('transfuser');
//
var HttpFramework_Express = require('./http.framework.express.js');
var HttpFramework_Hapi    = require('./http.framework.hapi.js');
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
    this._defaultAppName = path.basename(require.main.filename, '.js');

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
    this._stats = null;
    this._httpFramework = null;
    this._servicesConfig = {};
    this._isLoaded = false;

    // set logger
    logger = util.getLogger("HyperCore");

    // middleware manager
    this._middleware = new Middleware();

    // add catch all, just in case
    process.on('uncaughtException', function(err) {
        logger.error("Uncaught Error -", err, ", stack:", err.stack);
    });
}

Hyper.prototype.logger = function() {
    return util.getLogger();
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
    logger.groupEnd("");

    // add options passed in from inits
    this._config.hyper = _.merge(this._config.hyper, this._options);

    if(this._config.hyper.hasOwnProperty('displayDebuggerInfo')) {
        this._displayDebuggerInfo = this._config.hyper.displayDebuggerInfo;
    }

    // update logger options, using config
    logger.setOptions(this._config.hyper.logger);

    // load HTTP framework
    if(this._config.hyper.httpFramework === 'express') {
        // TODO: use DI to pass vars
        this._httpFramework = new HttpFramework_Express(this._config, this._stats);
    } else {
        logger.error("Uncaught Error -", err, ", stack:", err.stack);
        return;
    }

    // load default middleware
    this._loadDefaultMiddleware();

    // normalize config, adding service config
    this._servicesConfig = this._normalizeServicesConfig(servicesConfig);
    if(this._displayDebuggerInfo) {
        logger.info('servicesConfig:', JSON.stringify(this._servicesConfig, null, 2));
    }

    // service manager
    this._serviceManager = new ServiceManager(this._config, this._servicesConfig, this._middleware);
    this._serviceManager.setHttpFramework(this._httpFramework);

    return this._serviceManager.load()
        .then(function(){
            return this;
        }.bind(this));
};

Hyper.prototype.start = function(servicesConfig) {
    if(this._isLoaded) {
        logger.log('---------------------------------------------');
        return this._serviceManager.start();
    } else {
        return this.load(servicesConfig)
            .then(function(){
                logger.log('---------------------------------------------');
                return this._serviceManager.start();
            }.bind(this));
    }
};

Hyper.prototype.use = function(MiddlewareGroup, MiddlewareName, option) {
    this._middleware.use(MiddlewareGroup, MiddlewareName, option);
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
    var defaultAppName = this._defaultAppName;
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
                        process.cwd() + path.sep
                        + servicesConfig.services[appName].directory + path.sep
                        + '**' + path.sep
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
                    process.cwd() + path.sep
                    + servicesConfig.services[defaultAppName].directory + path.sep
                    + '**' + path.sep
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
