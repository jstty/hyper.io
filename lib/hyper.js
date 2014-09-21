'use strict';

/*
 * 
 */
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
    var appName = 'app';

    if(_.isString(servicesConfig)) {
        appName = servicesConfig;
        servicesConfig = {};
    }
    // make sure config is object
    if(!servicesConfig) {
        servicesConfig = {};
    }
    // ensure serviceConfig has an object with app name
    if( !servicesConfig.hasOwnProperty(appName)) {
        servicesConfig[appName] = {};
    }

    if( !servicesConfig.hasOwnProperty('services')) {
        // if config does not contain routes
        // try to load a routes file using app name
        if( !servicesConfig.hasOwnProperty('routes')) {
            try {
                var globs = glob.sync('**' + path.sep + appName + '.routes.js');

                if(globs.length > 1) {
                    logger.warn("More than one route file found", globs);
                }
                var file = process.cwd() + path.sep + globs[0];
                servicesConfig[appName].routes = require(file);
            } catch (err) {
                logger.error("Could not load routes files.", err);
                return;
            }
        } else {
            // move routes to in service object
            servicesConfig[appName].routes = servicesConfig.routes;
            delete servicesConfig.routes;
        }

        if( servicesConfig.hasOwnProperty('directory')) {
            // move routes to in service object
            servicesConfig[appName].directory = servicesConfig.directory;
            delete servicesConfig.directory;
        }
    } else {
        // move services to in service object
        servicesConfig[appName].services = servicesConfig.services;
        delete servicesConfig.services;
    }

    return servicesConfig;
};
