'use strict';

/**
 * API Route
 *
 */
var fs         = require('fs');
var http       = require('http');
var path       = require('path');
//
var _          = require('lodash');
var whenKeys   = require('when/keys');
var when       = require('when');
var di         = require('di');
var glob       = require('glob');
//
var util              = require('./util.js');
var defaultAppService = require('./default.service.app.js');
//
var ResourceHandler   = require('./handler.resource.js');

var logger = null;

module.exports = ServiceManager;

/* ---------------------------------------------------
 * Constructor
 * --------------------------------------------------- */
function ServiceManager(config, servicesConfig, middleware, serviceRouter, hyperCore) {
    this._displayDebuggerInfo = config.displayDebuggerInfo;
    this._hyperCore = hyperCore;
    this._serviceRouter = serviceRouter;

    this._config = _.merge({
        // defaults
    }, config);

    // TODO: statsD
    //this.stats     = new util.Stats(this.options, "ServiceManager");
    logger = util.logger('Services');

    this._servicesConfig = _.merge({
        // defaults
    }, servicesConfig);

    this._services  = {};

    this._middleware = middleware;

    this._resources = {};
}

/* ---------------------------------------------------
 * Public Functions
 * --------------------------------------------------- */
/*
  // validate API process order, see if collidate with other APIs

  default (first)
    static/public
    api
        pipeline: ['validate', 'resolve', 'controller']
    view
        pipeline: ['validate', 'resolve', 'controller', 'template']
  otherwise (last)
    static/public
    redirect
        to

  api
    controller
    method
    pipeline: ['validate', 'resolve', 'controller', 'post-process']
  view
    controller
    method
    pipeline: ['validate', 'resolve', 'controller', 'template']
 redirect
    from
    to


middleware
    template -> view
    route -> api/view
    api -> api

 * API/View:
 *      [required (middleware)] -> [input validator] -> [pre (middleware)] -> [resolve] -> controller method -> [post (middleware)] -> OUT (json)
 *
 * View:
 *      [required (middleware)] -> [input validator] -> [pre (middleware)] -> [resolve] -> controller method -> [post (middleware)] -> template (middleware) -> OUT (html)
 */
ServiceManager.prototype.setupDynamicRoute = function(service, controller, route) {
    var routeStr = route.api || route.view || "";

    if(!controller) {
        logger.error("Controller missing or invalid");
        return;
    }

    if(!routeStr) {
        logger.warn("Controller", type, "value invalid");
        return;
    }

    // TOOD: move this per method
    var templateFunc = null;

    //
    _.forEach(route.method, function(value, m) {
        m = m.toLowerCase(); // make sure method is lower case

        var cFunc, cInput, controllerObj = null;
        var methodFunctionName = "";

        if(_.isFunction(route.method[m])) {
            controllerObj = route.method[m];
            methodFunctionName = route.method[m].name + " (function)";
        }
        else if(_.isString(route.method[m])) {
            controllerObj = controller.instance[ route.method[m] ];
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

        logger.log("API Route:",
            controller.name || "-",
            "["+m+"]",
            "-", routeStr, "->", methodFunctionName);

        var middlewareList = [];
        if( route.required &&
            _.isObject(route.required) ) {

            // load all middleware if they exist
            for(var name in route.required){
                var middleware = this._middleware.get('route', name);

                // if get failed then
                // auto load middleware
                if(!middleware) { middleware = this._middleware.use('route', name); }
                if(!middleware) { middleware = this._middleware.use('route', 'hyper.io-'+name); }
                if(!middleware) { middleware = this._middleware.use('route', 'hyper.io-'+this._httpFramework.getName()+'-'+name); }

                if(middleware) {
                    middlewareList.push({
                        middleware: middleware,
                        options: route.required[name]
                    });
                }
            }
        }

        this._httpFramework.addMethodFunction(m, middlewareList, routeStr,
            // TODO: Unify this across both express and hapi
            function(req, res, next) {
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

                if(_.isObject(out)) {
                    // assume JSON
                    outContentType = outContentType || "application/json";
                    out = JSON.stringify(out);
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
            // Run resolvers
            // ---------------------------------------
            var resolved = {};
            // run the resolveFuncs
            _.forEach(route.resolve, function(func, key) {
                // TODO: dependency injection
                resolved[key] = func();
            }.bind(this));
            // promise map to save data to key
            var resolverPromise = whenKeys.map(resolved, function(value, key){
                resolved[key] = value;
            });

            resolverPromise.then(function(){
                var module = {
                    '$rawRequest':  ['value',   req],
                    '$rawResponse': ['value',   res],
                    '$next':        ['value',   next],
                    '$done':        ['value',   done],
                    '$error':       ['value',   error],
                    '$fatal':       ['value',   fatal],
                    '$session':     ['value',   req.session],
                    '$cookies':     ['value',   req.cookies],
                    '$input':       ['factory', this._httpFramework.buildInputs],
                    '$service':     ['value',   service.instance],
                    '$logger':      ['value',   util.logger(service.name + ' - ' + controller.name)]
                };

                // add resolved to DI
                _.forEach(resolved, function(value, key) {
                    module[key] = ['value', value];
                }.bind(this));

                this._injectionDependency(module, service, controller, cFunc);
                // ---------------------------------------
            }.bind(this));

        }.bind(this));
    }.bind(this));
};

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
