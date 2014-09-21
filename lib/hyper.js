'use strict';

/*
 * 
 */
var fs      = require('fs');
var path    = require('path');
var _       = require('lodash');
var glob    = require('glob');
var configz = require('configz');
//
var HttpFramework_Express = require('./http.framework.express.js');
var HttpFramework_Hapi    = require('./http.framework.hapi.js');
//
var PluginManager  = require('./manager.plugin.js');
var ServiceManager = require('./manager.service.js');
var util           = require('./util.js');

//
var logger = null;

module.exports = Hyper;

/*
 // TODO: option for verbosity of warnings/info/errors

 // TODO: framework plugins
 app.plugin('logger', 'stumpy');
 app.plugin('configs', 'configz');
 app.plugin('monitor', 'statsd');

 // TODO: resource plugins
 // added to 'app'(default) service
 app.resource('mongodb');

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
        return new Hyper(options);
    }

    this._options = _.merge({
        // default
        configs: [
            '$config.js',           // framework dir (default)
            'app.config.js',        // current dir
            '~config.custom.js'     // home dir
        ]
    }, options);

    // config manager
    // logger not loaded, yet so we can only user console
    console.log('---------------------------------------------');
    console.log('Loading Configuration...');
    this._configManager = new configz({
        basePath: __dirname
    });
    // blocking, but this is ok because the server needs the configs to proceed
    this._config = this._configManager.loadSync(this._options.configs);
    //console.log("config", JSON.stringify(this._config, null, 2));

    // TODO: statsD
    this._stats = null;
    this._httpFramework = null;
    this._servicesConfig = {};
    this._isLoaded = false;

    // set logger
    logger = util.getLogger(this._config.hyper.logger);

    process.on('uncaughtException', function(err) {
        logger.error("Uncaught Error -", err, ", stack:", err.stack);
    });
}

Hyper.prototype.logger = function() {
    return util.getLogger();
};

// load services
// return promise
Hyper.prototype.load = function(servicesConfig) {
    this._isLoaded = true;

    if(this._config.hyper.httpFramework === 'express') {
        // TODO: use DI to pass vars
        this._httpFramework = new HttpFramework_Express(this._config, this._stats);
    }
    else if(this._config.hyper.httpFramework === 'hapi') {
        // TODO: use DI to pass vars
        this._httpFramework = new HttpFramework_Hapi(this._config, this._stats);
    } else {
        logger.error("Uncaught Error -", err, ", stack:", err.stack);
        return;
    }

    // normalize config, adding service config
    this._servicesConfig = this._normalizeServicesConfig(servicesConfig);

    // service manager
    this._serviceManager = new ServiceManager(this._config, this._servicesConfig);
    this._serviceManager.setHttpFramework(this._httpFramework);

    return this._serviceManager.load();
};

Hyper.prototype.start = function(servicesConfig) {
    if(this._isLoaded) {
        return this._serviceManager.start();
    } else {
        return this.load(servicesConfig)
            .then(function(){
                return this._serviceManager.start();
            }.bind(this));
    }
};


Hyper.prototype._normalizeServicesConfig = function(servicesConfig) {
    // make sure config is object
    if(!servicesConfig) {
        servicesConfig = {};
    }

    var defaultAppName = 'app';
    if(_.isString(servicesConfig)) {
        defaultAppName = servicesConfig;
        servicesConfig = {};
    }

    if( !servicesConfig.hasOwnProperty('services')) {
        servicesConfig.services = {};
        // ensure serviceConfig has an object with app name
        servicesConfig.services[defaultAppName] = {
            // default lib dir
            directory: "lib"
        };

        if( servicesConfig.hasOwnProperty('directory')) {
            // move routes to in service app object
            servicesConfig.services[defaultAppName].directory = servicesConfig.directory;
            delete servicesConfig.directory;
        }

        // check if servicesConfig[appName].directory exists
        if(!fs.existsSync(servicesConfig.services[defaultAppName].directory)) {
            // if not, set to current working dir
            servicesConfig.services[defaultAppName].directory = process.cwd();
        }

        // if config does not contain routes
        // try to load a routes file using app name
        if( !servicesConfig.hasOwnProperty('routes')) {
            try {
                // use directory as root to look for routes file
                var globs = glob.sync(servicesConfig.services[defaultAppName].directory + path.sep + '**' + path.sep + defaultAppName + '.routes.js');

                if(globs.length == 0) {
                    logger.error("Could not find a routes files and service defined");
                    return;
                }
                else if(globs.length > 1) {
                    logger.warn("More than one route file found", globs);
                }

                var file = path.resolve( globs[0] );
                servicesConfig.services[defaultAppName].routes = require(file);
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
        _.forEach(this._servicesConfig, function(service, key) {
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

    return servicesConfig;
};
