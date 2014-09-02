'use strict';

/**
 * Manager for Services
 *
 * Module dependencies:
 *  lodash     - https://github.com/lodash/lodash
 *  when       - https://github.com/cujojs/when
 *  express    - https://github.com/visionmedia/express
 *  multiparty - https://github.com/superjoe30/node-multiparty
 *
 */
var fs         = require('fs');
var http       = require('http');
var path       = require('path');

var _          = require('lodash');
var when       = require('when');
var express    = require('express');
var di         = require('di');
var ejs        = require('ejs');
//
var util              = require('./util.js');
var defaultAppService = require('./default.service.app.js');

var logger = null;

module.exports = ServiceManager;

/* ---------------------------------------------------
 * Consructor
 * --------------------------------------------------- */
function ServiceManager(config, servicesConfig){
    this._config = _.merge({
        // defaults
    }, config);

    // TODO: statsD
    //this.stats     = new Util.Stats(this.options, "ServiceManager");
    logger = util.getLogger('ServiceManager');

    this._servicesConfig = _.merge({
        // defaults
    }, servicesConfig);

    this._services  = {};
}

/* ---------------------------------------------------
 * Public Functions
 * --------------------------------------------------- */
ServiceManager.prototype.setHttpFramework = function(httpFramework) {
    this._httpFramework = httpFramework;
};

// load all services
ServiceManager.prototype.load = function() {
    var appPromise = this._httpFramework.load();

    appPromise
        .then(function(){
            logger.group("Loading Services...");
            _.forEach(this._servicesConfig, function(service, key) {
                this._services[key] = {};
                this._services[key].name    = key;
                this._services[key].config  = service || {};
                this._services[key].options = service.options || {};
                this._services[key].routes  = service.routes || {};
                this._services[key].controller = {};
                this._services[key].directory  = "";

                // directory default: "lib/<service key name in service list>"
                if(!service.directory) {
                    this._services[key].directory = "lib" + path.sep + key;
                } else {
                    this._services[key].directory = service.directory;
                }

                // module default: "./<directory>/service.js"
                if(!service.module) {
                    this._services[key].module = this._loadServiceFile(key, this._services[key].directory);

                    if(!this._services[key].module) {
                        // use default
                        this._services[key].module = defaultAppService;
                        this._services[key].directory = this._findControllerRootDir(this._services[key].directory);

                        if(!this._services[key].directory ){
                            logger.info("Could not Controllers dir in App dir (" + process.cwd() + ")");
                        }
                    }
                } else {
                    this._services[key].module = service.module;
                }

                // create instance of module
                if(this._services[key].module) {
                    logger.group("Loading Service "+key+"...");

                    this._services[key].instance = new this._services[key].module(this._services[key].options);
                    // setup service routes
                    this._setupRoutes(this._services[key]);

                    logger.groupEnd(" ");
                }

            }.bind(this));
            logger.groupEnd(" ");

            if(this._config.default) {
                this._setupDefaultRoute(this._config.default);
            }

        }.bind(this));

    return appPromise;
};


//  start services
ServiceManager.prototype.start = function() {
    return this._httpFramework.start();
};


/* ---------------------------------------------------
 * Private Functions
 * --------------------------------------------------- */
ServiceManager.prototype._setupRoutes = function(service) {
    _.forEach(service.routes, function(route) {

        var controllerName = this._setupController(service, route);
        var controller = service.controller[controllerName];
        if(controller) {
            controller.name = controllerName;
        }

        if(route.hasOwnProperty('api')) {
            this.setupDynamicRoute("api", service, controller, route);
        }
        else if(route.hasOwnProperty('view')) {
            this.setupDynamicRoute("view", service, controller, route);
        }
        else if(route.hasOwnProperty('static')) {
            this._setupStaticRoute(service, route);
        }
        else if(route.hasOwnProperty('redirect')) {
            this._setupRedirectRoute(service, route);
        }
        else {
            logger.warn("Service \""+service.name+"\" has invalid route", route);
        }

    }.bind(this));
};

ServiceManager.prototype._setupController = function(service, route) {
    var controller;
    var controllerName = 'defaultController';

    if(!route.controller) {
        // no controller, this is ok for statics
        return;
    }
    else if(_.isString(route.controller) ) {
        controllerName = route.controller;
    }
    else if( _.isObject(route.controller) &&
             route.controller.hasOwnProperty('name') ) {
        controllerName = route.controller.name;
    }

    if(service.controller[controllerName]) {
        // controller already loaded
        return controllerName;
    }

    //logger.log("      Loading Controller: "+controllerName);
    // controller default: "<service.directory>/controllers/<controller>.js"
    if(_.isString(route.controller) ) {
        // try to load controller as file
        var file = route.controller;
        if(fs.existsSync(file)) {
            controller = require(file);
        } else {
            file = path.normalize(service.directory + path.sep + "controllers" + path.sep + route.controller + ".js");
            if(fs.existsSync(file)) {
                // need to add the current cwd because require is relative to this file
                controller = require(file);
            } else {
                // error
                logger.warn("Service \""+service.name+"\" controller ("+route.controller+") invalid");
                return;
            }
        }
    }
    else if(_.isObject(route.controller) ) {
        controller = route.controller;
    } else {
        // error
        logger.warn("Service \""+service.name+"\" controller ("+route.controller+") invalid");
        return;
    }

    // TODO: dependency injection
    if(_.isFunction(controller)) {
        service.controller[controllerName] = new controller(service.instance, service.options[ controllerName ]);
    } else {
        service.controller[controllerName] = controller;
    }

    return controllerName;
};

ServiceManager.prototype._findControllerRootDir = function(serviceDir) {
    var baseDir = process.cwd() + path.sep + serviceDir + path.sep;
    var controllersDir = "controllers";
    var dir = "";

    // try app lib service dir ([app root]/lib/[service name]/controller)
    dir = path.normalize(baseDir + controllersDir);
    // check if lib/controller exists
    if(fs.existsSync(dir)) {
        return path.normalize(dir + path.sep + "..");
    } else {
        logger.info("Could not find Controllers dir ("+dir+")");
    }

    // try app lib dir ([app root]/lib/controller)
    dir = path.normalize(baseDir + ".." + path.sep + controllersDir);
    // check if lib/controller exists
    if(fs.existsSync(dir)) {
        return path.normalize(dir + path.sep + "..");
    } else {
        logger.info("Could not find Controllers dir ("+dir+")");
    }

    // try app dir ([app root]/controller)
    dir = path.normalize(baseDir + ".." + path.sep + ".." + path.sep + controllersDir);
    // check if lib/controller exists
    if(fs.existsSync(dir)) {
        return path.normalize(dir + path.sep + "..");
    } else {
        logger.info("Could not find Controllers dir ("+dir+")");
    }

    return null;
};


ServiceManager.prototype._loadServiceFile = function(key, directory) {
    var moduleFile = "";

    // try to loading with directory path
    moduleFile = process.cwd() + path.sep + directory + path.sep + "service." + key + ".js";
    // check if file exists
    if (fs.existsSync(moduleFile)) {
        return require(moduleFile);
    } else {
        logger.info("Could not find service file \"" + key + "\" (" + moduleFile + ")");
    }

    // try to loading withOUT directory path
    moduleFile = process.cwd() + path.sep + "service." + key + ".js";
    // check if file exists
    if (fs.existsSync(moduleFile)) {
        return require(moduleFile);
    } else {
        logger.info("Could not find service file \"" + key + "\" (" + moduleFile + ")");
    }

    return null;
};


/*
 * API:
 *      [resolver] -> [input validator] -> controller method -> OUT (json)
 *
 * View:
 *      [resolver] -> [input validator] -> controller method -> template -> OUT (html)
 *
 */
ServiceManager.prototype.setupDynamicRoute = function(type, service, controller, route) {
    var routeStr = route.api || route.view || "";

    if(!routeStr) {
        logger.warn("Controller", type, "value invalid");
        return;
    }

    if(!controller) {
        logger.info("Controller missing for", routeStr);
        controller = {};
    }

    var templateFunc;
    if( type == "view" ){
        if( !route.hasOwnProperty('template')) {
            logger.warn("Template missing from route view", routeStr);
            return;
        }

        // TODO: load template
        // required, default "<service.directory>/views/<template>"
        var templateFile = route.template;
        if( !fs.existsSync(templateFile) ) {

            templateFile = service.directory + path.sep + "views" + path.sep + route.template;
            if( !fs.existsSync(templateFile) ) {
                logger.warn("Could not find Template", route.template, "at", templateFile);
                return;
            }
        }

        var templateData = fs.readFileSync(templateFile, 'utf8');
        templateFunc = ejs.compile(templateData);
    }


    _.forEach(route.method, function(value, m) {
        m = m.toLowerCase(); // make sure method is lower case

        var cFunc, cInput, controllerObj = null;
        var methodFunctionName = "";

        if(_.isFunction(route.method[m])) {
            controllerObj = route.method[m];
            methodFunctionName = route.method[m].name + " (function)";
        }
        else if(_.isString(route.method[m])) {
            controllerObj = controller[ route.method[m] ];
            methodFunctionName = route.method[m];
        }

        if(_.isFunction(controllerObj)) {
            cFunc = controllerObj;
        }
        else if(_.isObject(controllerObj)) {
            cFunc  = controllerObj.run;

            if(_.isObject(controllerObj.input)) {
                cInput = controllerObj.input;
            }
        } else {
            // if function does not exist in controller
            logger.warn("Invalid Controller Function/Object", route.method[m]);
            return;
        }

        if( !cFunc || !_.isFunction(cFunc) ) {
            logger.warn("Controller missing method function", route.method[m]);
            return;
        }

        if(!this._httpFramework.validateMethod(m)) {
            return;
        }

        if(type == "api") {
            logger.log("API Route:",
                controller.name || "-",
                "["+m+"]",
                "-", routeStr, "->", methodFunctionName);
        }
        else if( type == "view") {
            logger.log("View Route:",
                controller.name || "-",
                "["+m+"]",
                "-", routeStr, "->", methodFunctionName);
        }

        this._httpFramework.addMethodFunction(m, routeStr,
            // TODO: Unify this across both express and hapi
            function(req, res, next) {
            // ---------------------------------------
            // TODO: run resolvers
            // ---------------------------------------

            // ---------------------------------------
            // TODO: Custom error format, defined in config
            // General Response function
            var responded = false;
            function responseFunc(out, code, headers){
                if(responded) {
                    logger.warn("Already responded to request");
                    return;
                }

                responded = true;
                var outContentType = route.outContentType;
                //logger.log("responseFunc out:", out);s

                // if view compile template
                if( type == "view" &&
                    templateFunc) {
                    out = templateFunc(out);
                }

                if(_.isObject(out)) {
                    // assume JSON
                    outContentType = outContentType || "application/json";
                    out = JSON.stringify(out);
                } else {
                    // assume HTML
                    outContentType = outContentType || "text/html";
                }

                // merge default content-type with headers
                res.writeHead(code, _.merge({
                    "Content-Type": outContentType
                }, headers));
                res.end( out );
            };

            // TODO: dependency injection
            var done = function(out, code, headers) {
                responseFunc(out, code || 200, headers);
            };
            // TODO: dependency injection
            var error = function(out, code, headers) {
                responseFunc(out, code || 400, headers);
            };
            // TODO: dependency injection
            var fatal = function(out, code, headers) {
                responseFunc(out, code || 500, headers);
            };
            // ---------------------------------------

            // ---------------------------------------
            // validate input, if inputs need validating
            if( cInput ) {
                // bad inputs
                var validateErrors = this._validateInputs(cInput, req);
                if(validateErrors) {
                    error(validateErrors);
                    return;
                }
            }
            // ---------------------------------------

            // ---------------------------------------
            // injection dependency to Controller function
            // NOTE: di does not work when you user cFunc.bind(...) as it hides the function arguments
            var module = {
                '$rawRequest':  ['value', req],
                '$rawResponse': ['value', res],
                '$next':        ['value', next],
                '$done':        ['value', done],
                '$error':       ['value', error],
                '$fatal':       ['value', fatal],
                '$input':       ['factory', buildInputs]
            };
            var injector = new di.Injector( [module] );
            // run controller function
            injector.invoke( cFunc, controller );
            // ---------------------------------------

        }.bind(this));
    }.bind(this));
};

// inject dependency from controller function DI
function buildInputs($rawRequest) {
    // POST - req.body
    // GET  - req.query
    // GET  - req.hash
    // URL  - req.params

    // TODO: Unify this across both express and hapi
    return _.pick($rawRequest, [
        "query",
        "hash",
        "params",
        "body"
    ]);
}

// TODO: replace with lib, move to http.framework
ServiceManager.prototype._validateInputs = function(cInput, req) {
    var errors = [];

    for(var i in cInput) {
        //logger.log("_validateInputs:" , i);

        // check input type
        if(req.hasOwnProperty(i)) {

            for(var k in cInput[i]) {
                // check required
                if( !req[i].hasOwnProperty(k) &&
                    cInput[i][k].required){
                    // missing
                    errors.push({error: "Missing "+i+" "+k, type: "missing", id: k});
                }
                // check type
                else if( req[i].hasOwnProperty(k)  &&
                    cInput[i][k].type ) {

                    var tFuncName = "is"+util.String.capitalize( cInput[i][k].type );
                    // check if lodash has type function
                    if(_[tFuncName]) {
                        // check if input passes type function
                        if( !_[tFuncName]( req[i][k] ) ){
                            errors.push({error: "Invalid input "+k+" with value "+req[i][k]+", expecting type "+i, type:"invalid", id: k});
                        }
                    }
                }
            }

        }
    }

    if(errors.length == 0) {
        errors = undefined;
    }
    if(errors.length == 1) {
        errors = errors[0];
    }
    return errors;
};

ServiceManager.prototype._addStaticRoute = function(staticContent, route) {

    // if staticContent is array call self with array value
    if( _.isArray(staticContent) ) {
        var ok = false;
        for(var i = 0; i < staticContent.length; i++){
            ok = (this._addStaticRoute(staticContent[i]) || ok);
        }
        return ok;
    } else {

        try {
            // check if file/dir exists
            if (fs.existsSync(staticContent)) {

                // get stats to see if file or dir
                var stats = fs.lstatSync(staticContent);

                if (stats.isDirectory()) {
                    //logger.log("Adding Static Dir Content -", staticContent);
                    logger.log("Static Dir Route:", staticContent);

                    this._httpFramework.addStaticDir(staticContent);
                    return true;
                } else {
                    //logger.log("Adding Static File -", staticContent);
                    logger.log("Static File Route:", staticContent, "->", route || staticContent);

                    // if route set then use it, otherwise use staticContent
                    this._httpFramework.addMethodFunction('get', route || staticContent, function(req, res){
                        res.sendfile( staticContent );
                    }.bind(this));
                    return true;
                }
            } else {
                // Static File/Dir does not exist
                // this is ok, go to next
                logger.warn("Static File/Dir does not exist -", staticContent);
                return false;
            }
        }
        catch (err) {
            logger.warn("Add Static Route Error:", err);
            return false;
        }
    }
};


ServiceManager.prototype._setupStaticRoute = function(service, route) {
    //logger.log("      Static Route -", route.static);

    this._addStaticRoute(route.static);
};

ServiceManager.prototype._setupRedirectRoute = function(service, route) {
    //logger.log("      Redirect Route -", route.redirect);

    if(!route.redirect.hasOwnProperty('from')) {
        logger.warn(service.name, "Service Route - Redirect missing 'from'");
        return;
    }
    if(!route.redirect.hasOwnProperty('to')) {
        logger.warn(service.name, "Service Route - Redirect missing 'to'");
        return;
    }

    this._httpFramework.addRedirect(route.redirect.from, route.redirect.to);
};


ServiceManager.prototype._setupDefaultRoute = function(defaultConfig) {

    for(var i = 0; i < defaultConfig.static.length; i++) {
        // if NOT added static route ok, some error like files does not exist
        if( !this._addStaticRoute( defaultConfig.static[i] ) ) {

            logger.warn("Adding Static Failed Using Root:", defaultConfig.static[i], "->", defaultConfig.root);
            // then send root file
            this._httpFramework.addStaticFile(defaultConfig.static[i], defaultConfig.root);
        }
    }

    logger.log("Root -", defaultConfig.root);
    // root
    this._httpFramework.addStaticFile("/", defaultConfig.root);

    logger.log("Default -", defaultConfig.root);
    // all others -> DEFAULT
    this._httpFramework.addStaticFileDefault(defaultConfig.root);
};
