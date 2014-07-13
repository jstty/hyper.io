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
var util       = require('./util.js');

module.exports = ServiceManager;


function ServiceManager(config){
    this._config = _.merge({

    }, config);

    //this.stats     = new Util.Stats(this.options, "ServiceManager");
    this._servicesConfig = this._config.services;
    this._services  = {};
    this._routes    = {}
}

// load all services
ServiceManager.prototype.load = function(app) {
    this.app = app;

    console.log('---------------------------------------------');
    console.log("ServiceManager: Loading Services...");
    _.forEach(this._servicesConfig, function(service, key) {
        this._services[key] = {};
        this._services[key].name = key;
        this._services[key].config = service;
        this._services[key].options = service.options;
        this._services[key].controller = {};
        this._services[key].directory = "";

        // directory default: "lib/<service key name in service list>"
        if(!service.directory) {
            this._services[key].directory = "lib" + path.sep + key;
        } else {
            this._services[key].directory = service.directory;
        }

        // module default: "./<directory>/service.js"
        if(!service.module) {
            var moduleFile = process.cwd() +path.sep + this._services[key].directory + path.sep+"service."+key+".js";

            // check if file exists
            if(fs.existsSync(moduleFile)) {
                this._services[key].module = require(moduleFile);
            } else {
                // not valid no longer needed
                delete this._services[key];
                console.warn("ServiceManager: Service \""+key+"\" module file missing ("+moduleFile+")");
                return; // end loop
            }
        }

        if(service.module) {
            console.log("   Service "+key+"");
            this._services[key].instance = new service.module(service.options);
            this.setupRoutes(this._services[key]);
        }

    }.bind(this));

    this.setupDefaultRoute(this._config.default);

    console.log('---------------------------------------------');
};

ServiceManager.prototype.setupRoutes = function(service) {

    console.log('   ------------------------------------------');
    _.forEach(service.config.routes, function(route) {

        var controllerName = this.setupController(service, route);
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
            this.setupStaticRoute(service, route);
        }
        else if(route.hasOwnProperty('redirect')) {
            this.setupRedirectRoute(service, route);
        }
        else {
            console.warn("ServiceManager: Service \""+service.name+"\" has invalid route", route);
        }

    }.bind(this));
    console.log('   ------------------------------------------');

};

ServiceManager.prototype.setupController = function(service, route) {
    var controller, controllerName;

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
    } else {
        console.warn("ServiceManager: Service \""+service.name+"\" controller ("+route.controller+") invalid");
        return;
    }

    if(service.controller[controllerName]) {
        // controller already loaded
        return controllerName;
    }

    //console.log("      Loading Controller: "+controllerName);
    // controller default: "<service.directory>/controllers/<controller>.js"
    if(_.isString(route.controller) ) {
        // try to load controller as file
        var file = route.controller;
        if(fs.existsSync(file)) {
            controller = require(file);
        } else {
            file = service.directory + path.sep+"controllers"+path.sep + route.controller + ".js";
            if(fs.existsSync(file)) {
                // need to add the current cwd because require is relative to this file
                controller = require(process.cwd() + path.sep + file);
            } else {
                // error
                console.warn("ServiceManager: Service \""+service.name+"\" controller ("+route.controller+") invalid");
                return;
            }
        }
    }
    else if(_.isObject(route.controller) ) {
        controller = route.controller;
    } else {
        // error
        console.warn("ServiceManager: Service \""+service.name+"\" controller ("+route.controller+") invalid");
        return;
    }

    // TODO: dependency injection
    service.controller[controllerName] = new controller(service.instance, service.options[ controllerName ]);
    return controllerName;
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
        console.warn("ServiceManager: Controller", type, "value invalid");
        return;
    }

    if(!controller) {
        console.warn("ServiceManager: Controller missing for", routeStr);
        return;
    }

    var templateFunc;
    if( type == "view" ){
        if( !route.hasOwnProperty('template')) {
            console.warn("ServiceManager: Template missing from route view", routeStr);
            return;
        }

        // TODO: load template
        // required, default "<service.directory>/views/<template>"
        var templateFile = route.template;
        if( !fs.existsSync(templateFile) ) {

            templateFile = service.directory + path.sep + "views" + path.sep + route.template;
            if( !fs.existsSync(templateFile) ) {
                console.warn("ServiceManager: Could not find Template", route.template, "at", templateFile);
                return;
            }
        }

        var templateData = fs.readFileSync(templateFile, 'utf8');
        templateFunc = ejs.compile(templateData);
    }


    _.forEach(route.method, function(value, m) {
        m = m.toLowerCase(); // make sure method is lower case

        var cFunc, cInput;
        var controllerObj = controller[ route.method[m] ];
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
            console.warn("ServiceManager: Invalid Controller Function/Object", route.method[m]);
            return;
        }

        if( !cFunc || !_.isFunction(cFunc) ) {
            console.warn("ServiceManager: Controller missing method function", route.method[m]);
            return;
        }

        if( !this.app[ m ] ||
            !_.isFunction(this.app[ m ])) {
            console.warn("ServiceManager: Invalid method", m);
            return;
        }

        if(type == "api") {
            console.log("   API Route:",
                controller.name || "Controller",
                "["+m+"]",
                "-", routeStr, "->", route.method[m]);
        }
        else if( type == "view") {
            console.log("   View Route:",
                controller.name || "Controller",
                "["+m+"]",
                "-", routeStr, "->", route.method[m]);
        }

        this.app[ m ](routeStr, function(req, res, next) {
            // ---------------------------------------
            // TODO: run resolvers
            // ---------------------------------------

            // ---------------------------------------
            // TODO: Custom error format, defined in config
            // General Response function
            var responded = false;
            function responseFunc(out, code, headers){
                if(responded) {
                    console.warn("ServiceManager: Already responded to request");
                    return;
                }

                responded = true;
                var outContentType = route.outContentType;

                console.log("responseFunc out:", out);

                // if view compile template
                if( type == "view" &&
                    templateFunc) {
                    out = templateFunc(out);
                }

                if(_.isObject(out)) {
                    // assume JSON
                    outContentType = outContentType || "application/json";
                    out = JSON.parse(out);
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
                var validateErrors = this.validateInputs(cInput, req);
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
    return _.pick($rawRequest, [
        "query",
        "hash",
        "params",
        "body"
    ]);
}

ServiceManager.prototype.validateInputs = function(cInput, req) {
    var errors = [];

    for(var i in cInput) {
        console.log("validateInputs:" , i);

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

ServiceManager.prototype.addStaticRoute = function(staticContent, route) {

    // if staticContent is array call self with array value
    if( _.isArray(staticContent) ) {
        var ok = false;
        for(var i = 0; i < staticContent.length; i++){
            ok = (this.addStaticRoute(staticContent[i]) || ok);
        }
        return ok;
    } else {

        try {
            // check if file/dir exists
            if (fs.existsSync(staticContent)) {

                // get stats to see if file or dir
                var stats = fs.lstatSync(staticContent);

                if (stats.isDirectory()) {
                    //console.log("      Adding Static Dir Content -", staticContent);
                    console.log("   Static Dir Route:", staticContent);

                    this.app.use(express.static(staticContent));
                    return true;
                } else {
                    //console.log("      Adding Static File -", staticContent);
                    console.log("Static File Route:", staticContent, "->", route || staticContent);

                    // if route set then use it, otherwise use staticContent
                    this.app.get(route || staticContent, function(req, res){
                        res.sendfile( staticContent );
                    }.bind(this));
                    return true;
                }
            } else {
                // Static File/Dir does not exist
                // this is ok, go to next
                console.warn("ServiceManager: Static File/Dir does not exist -", staticContent);
                return false;
            }
        }
        catch (err) {
            console.warn("ServiceManager: Add Static Route Error:", err);
            return false;
        }
    }
};


ServiceManager.prototype.setupStaticRoute = function(service, route) {
    //console.log("      Static Route -", route.static);

    this.addStaticRoute(route.static);
};

ServiceManager.prototype.setupRedirectRoute = function(service, route) {
    //console.log("      Redirect Route -", route.redirect);

    if(!route.redirect.hasOwnProperty('from')) {
        console.warn("ServiceManager:", service.name, "Service Route - Redirect missing 'from'");
        return;
    }
    if(!route.redirect.hasOwnProperty('to')) {
        console.warn("ServiceManager:", service.name, "Service Route - Redirect missing 'to'");
        return;
    }

    this.app.use(route.redirect.from, function(req, res) {
        res.redirect(route.redirect.to);
    }.bind(this));
};


ServiceManager.prototype.setupDefaultRoute = function(defaultConfig) {

    for(var i = 0; i < defaultConfig.static.length; i++) {
        // if NOT added static route ok, some error like files does not exist
        if( !this.addStaticRoute( defaultConfig.static[i] ) ) {

            console.warn("ServiceManager: Adding Static Failed Using Root:", defaultConfig.static[i], "->", defaultConfig.root);
            // then send root file
            this.app.get(defaultConfig.static[i], function rootRoute(req, res){
                res.sendfile( defaultConfig.root );
            }.bind(this));
        }
    }

    console.log("Root -", defaultConfig.root);
    // root
    this.app.get("/", function rootRoute(req, res){
        res.sendfile( defaultConfig.root );
    }.bind(this));

    console.log("Default -", defaultConfig.root);
    // all others -> DEFAULT
    this.app.use(function defaultRoute(req, res) {
        res.sendfile( defaultConfig.root );
    }.bind(this));
};
