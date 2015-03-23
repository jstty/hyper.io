'use strict';

/**
 * Manager for Services
 *
 * TODO: break this file up into smaller modules
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
//
var _          = require('lodash');
var whenKeys   = require('when/keys');
var when       = require('when');
var di         = require('di');
var glob       = require('glob');
//
var util              = require('./util.js');
var defaultAppService = require('./default.service.app.js');

var logger = null;

module.exports = ServiceManager;

/* ---------------------------------------------------
 * Constructor
 * --------------------------------------------------- */
function ServiceManager(config, servicesConfig, middleware) {
    this._displayDebuggerInfo = config.hyper.displayDebuggerInfo;

    this._config = _.merge({
        // defaults
    }, config);

    // TODO: statsD
    //this.stats     = new util.Stats(this.options, "ServiceManager");
    logger = util.getLogger('Services');

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
ServiceManager.prototype.setHttpFramework = function(httpFramework) {
    this._httpFramework = httpFramework;
};

// load all services
ServiceManager.prototype.load = function() {
    var appPromise = this._httpFramework.load();

    appPromise
        .then(function(){
            logger.log('---------------------------------------------');
            logger.group("Loading Services...");
            _.forEach(this._servicesConfig.services, function(service, key) {
                this._services[key] = {};
                this._services[key].name    = key;
                this._services[key].config  = service.config  || {};
                this._services[key].options = service.options || {};
                this._services[key].routes  = service.routes  || {};
                this._services[key].controller = {};
                this._services[key].resolver   = {};
                this._services[key].directory  = { service: "", controllers: "", resolvers: "", views: "", static: ""};

                // set dir to something
                if(!service.directory) { service.directory = this._services[key].directory; }

                if(_.isString(service.directory)) {
                    var dir = service.directory;
                    service.directory = { service: dir, controllers: "", resolvers: "", views: "", static: ""};
                }

                // find dir for each type
                for(var d in this._services[key].directory) {
                    this._services[key].directory[d] = this._findDir(d, service.directory[d], key, this._services[key].directory.service);

                    if(!this._services[key].directory[d]){
                        logger.error("Could not find "+d+" dir in App dir (" + process.cwd() + ")");
                        return;
                    }
                }

                // load default middleware into service
                this._loadDefaultServiceMiddleware(this._services[key]);

                // module default: "./<directory>/service.js"
                if(!service.module) {
                    this._services[key].module = this._loadServiceFile(key, this._services[key].directory.service);

                    if( !this._services[key].module ||
                        !_.isFunction(this._services[key].module)) {
                        // use default
                        this._services[key].module = defaultAppService;
                    }
                } else {
                    this._services[key].module = service.module;
                }

                // create instance of module
                if( this._services[key].module ) {
                    logger.group("Loading Service "+key+"...");

                    var module = {};
                    if( this._services[key] &&
                        this._services[key].hasOwnProperty('options')) {
                        module['$options'] = ['value', this._services[key].options ];
                    }

                    var InjectedModule = this._injectionDependency(module, this._services[key]);
                    this._services[key].instance = new InjectedModule();

                    // setup service routes
                    this._setupRoutes(this._services[key]);

                    logger.groupEnd(" ");
                }

                if(this._displayDebuggerInfo) {
                    logger.info('services["%s"]: %s', key, JSON.stringify(this._services[key], null, 2));
                }
            }.bind(this));
            logger.groupEnd(" ");

        }.bind(this));

    return appPromise;
};


//  start services
ServiceManager.prototype.start = function() {
    return this._httpFramework.start();
};


ServiceManager.prototype.addResource = function(name, resourceModule, type) {
    if(!type) {
        type = 'factory';
    }

    if(!_.isString(name)) {
        logger.error("argument1 ('name') needs to be a string");
    }

    if(!resourceModule) {
        resourceModule = name;
    }

    logger.log('Adding Resource "%s"', name);

    // if string try to load file
    if(_.isString(resourceModule)) {
        // load resource from file
        resourceModule = this._loadResourceFile(name, resourceModule);
    }

    if(type == 'factory') {
        if (_.isFunction(resourceModule)) {
            // TODO: add dependancy injection
            resourceModule = new resourceModule(when);
        } else {
            logger.error("argument2 ('resource') needs to be a function/module");
        }
    }

    if(_.isObject(resourceModule)) {
        this._resources[name] = {
            module: resourceModule,
            instance: resourceModule
        };
    } else {
        logger.info("Could not find or load resource '%s'", name);
    }
};


ServiceManager.prototype._loadResourceFile = function(name, file) {
    var mod = null;
    var type = 'resource';

    var tmpFile = path.join(process.cwd(), file);
    if (fs.existsSync(tmpFile)) {
        try {
            return require(tmpFile);
        } catch(err) {}
    }

    mod = this._loadFile(type, name, file);
    if(mod) { return mod; }

    mod = this._loadFile(type, name, '.');
    if(mod) { return mod; }

    for(var key in this._services) {
        mod = this._loadFile(type, name, this._services[key].directory.service);
        if(mod) { return mod; }
    }

    return null;
};


ServiceManager.prototype._loadFile = function(type, key, directory) {
    var file = "";

    // try to loading service file
    file = directory + path.sep + key + ".js";
    file = path.join(process.cwd(), file);
    //logger.info('Trying to load:', file);

    // check if file exists
    if (fs.existsSync(file)) {
        try {
            return require(file);
        } catch(err) {}
    } else {
        // try to loading service file
        file = directory + path.sep + type + "." + key + ".js";
        file = path.join(process.cwd(), file);
        //logger.info('Trying to load:', file);

        // check if file exists
        if (fs.existsSync(file)) {
            try {
                return require(file);
            } catch(err) {}
        }
    }

    return null;
};

/* ---------------------------------------------------
 * Private Functions
 * --------------------------------------------------- */

// directory default: "lib/<service key name in service list>"
ServiceManager.prototype._findDir = function(type, configDirectory, serviceName, serviceDir) {
    // check if configDir is set, a string and not empty
    if( configDirectory &&
        _.isString(configDirectory) &&
        configDirectory.length > 0) {
        // add cwd, if need be
        configDirectory = path.resolve(configDirectory);
        if(fs.existsSync(configDirectory)) {
            return configDirectory;
        }
    }

    // find it
    var file = "";

    if(type === "service") {
        // look for service/app file
        file = path.sep + "service." + serviceName + ".js";
        var globs = glob.sync('**' + file);

        // remove all node_modules
        globs = util.filterNodeModules(globs);

        // check if file exists
        if (globs.length > 0) {
            if (globs.length > 1) {
                logger.warn("More than one service file found", globs);
            }
            // dirname removes files from results
            return path.dirname(process.cwd() + path.sep + globs[0]);
        }

        file = path.sep + serviceName + ".js";
        var globs = glob.sync('**' + file);
        // remove all node_modules
        globs = util.filterNodeModules(globs);

        // check if file exists
        if (globs.length > 0) {
            if (globs.length > 1) {
                logger.warn("More than one service file found", globs);
            }
            // dirname removes files from results
            return path.dirname(process.cwd() + path.sep + globs[0]);
        }

        // default "<cwd>/<service.dir>/lib"
        return process.cwd() + path.sep + "lib";
    } else {
        // start in service dir
        var globs = glob.sync(serviceDir + path.sep + '**' + path.sep + type);
        // remove all node_modules
        globs = util.filterNodeModules(globs);

        // check if file exists
        if (globs.length > 0) {
            if (globs.length > 1) {
                logger.warn("More than one service file found", globs);
            }
            return globs[0];
        }

        // default "<service.directory>/<type>"
        return serviceDir + path.sep + type;
    }
};

ServiceManager.prototype._setupRoutes = function(service) {
    _.forEach(service.routes, function(route) {

        // return controller created or from cache
        var controller = this._setupController(service, route);
        if(this._displayDebuggerInfo) {
            logger.info("Controller:", JSON.stringify(controller, null, 2));
        }

        // Setup Resolver, if they exist
        route.resolve = this._setupResolver(service, route);

        // switch based on the properties
        if( route.hasOwnProperty('api') ) {
            this.setupDynamicRoute("api", service, controller, route);
        }
        else if( route.hasOwnProperty('view') ) {
            this.setupDynamicRoute("view", service, controller, route);
        }
        else if(route.hasOwnProperty('static')) {
            this._setupStaticRoute(service, route);
        }
        else if(route.hasOwnProperty('redirect')) {
            this._setupRedirectRoute(service, route);
        }
        else if(route.hasOwnProperty('otherwise')) {
            this._setupDefaultRoute(service, route.otherwise);
        }
        else if(route.hasOwnProperty('default')) {
            this._setupDefaultRoute(service, route.default);
        }
        else {
            logger.warn("Service \""+service.name+"\" has invalid route", route);
        }

    }.bind(this));
};

ServiceManager.prototype._setupController = function(service, route) {
    var controller;
    var controllerName = service.name;

    // no controller, this is ok
    // create default controller
    if(!route.controller) {
        if(this._displayDebuggerInfo) {
            logger.info("Controller missing for", service.name);
        }

        service.controller[controllerName] = {
            name:     controllerName,
            config:   service.config,
            module:   function(){},
            instance: function(){}
        };
        return service.controller[controllerName];
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
        return service.controller[controllerName];
    } else {
        // create one, required data should be filled in the section below
        service.controller[controllerName] = {};
    }

    logger.info("Loading Controller:", controllerName);
    if(_.isString(route.controller) ) {
        // try to load controller as file
        var file = route.controller;
        controller = null;
        if(fs.existsSync(file)) {
            try {
                controller = require(file);
            } catch(err){}
        }

        if(!controller) {
            // controller default: "<service.directory>/controllers/<controller>.js"
            file = path.normalize(service.directory.controllers + path.sep + route.controller + ".js");
            if(fs.existsSync(file)) {
                // need to add the current cwd because require is relative to this file
                try {
                    controller = require(file);
                } catch(err){}
            }
        }

        if(!controller) {
            // error
            logger.warn("Service \""+service.name+"\" controller ("+route.controller+") invalid");
            return;
        } else {
            service.controller[controllerName].module = controller;
            logger.info("Loaded Controller:", controllerName);
        }
    }
    else if(_.isObject(route.controller) ) {
        if( route.controller.hasOwnProperty('module') &&
            route.controller.hasOwnProperty('instance') ) {
            service.controller[controllerName] = route.controller;
        } else {
            service.controller[controllerName].module = route.controller;
        }

    } else {
        // error
        logger.warn("Service \""+service.name+"\" controller ("+route.controller+") invalid");
        return;
    }

    // if controller does not have a config then pass service along
    if(!service.controller[controllerName].hasOwnProperty('config')) {
        service.controller[controllerName].config = service.config;
    }

    if(!service.controller[controllerName].instance) {
        if(_.isFunction(service.controller[controllerName].module)) {
            var module = {
                '$service':  ['value', service.instance],
                '$options':  ['value', service.options[ controllerName ] ]
            };

            var InjectedModule = this._injectionDependency(module, service.controller[controllerName]);

            service.controller[controllerName].instance = new InjectedModule();
            //service.controller[controllerName].instance = new controller();
        } else {
            service.controller[controllerName].instance = controller;
        }
    }

    return service.controller[controllerName];
};

ServiceManager.prototype._injectionDependency = function(module, parent, func) {
    // ---------------------------------------
    // injection dependency to Controller function
    // NOTE: di does not work when you use cFunc.bind(...) as it hides the function arguments
    module = _.merge({
        '$logger':      ['value',   logger],
        '$q':           ['value',   when]
    }, module);

    if( parent &&
        parent.hasOwnProperty('config')) {
        module['$config'] = ['value', parent.config];
    }

    // add all _resources to list for DI
    for(var rKey in this._resources) {
        module[rKey] = ['value', this._resources[rKey].instance];
    }

    // creates injector
    var injector = (new di.Injector( [module] ) );

    // run function
    if(func) {
        return injector.invoke( func, parent );
    }
    else {
        var InjectedWrapper = function() {
            return injector.invoke( parent.module, this );
        };
        InjectedWrapper.prototype = _.merge(InjectedWrapper.prototype, parent.module.prototype);

        return InjectedWrapper;
    }
    // ---------------------------------------
};

ServiceManager.prototype._setupResolver = function(service, route) {
    var resolver;
    var resolve = {};

    if(!route.resolve) {
        // no resolver, this is ok
        return;
    }
    else if( !_.isObject(route.resolve) ) {
        logger.warn("Service \""+service.name+"\" resolver ("+route.resolve+") invalid");
        return;
    }

    _.forEach(route.resolve, function(resolver, resolverBindName) {
        var resolverName = 'defaultResolver';
        var resolverFile = null;
        var resolverClass = null;

        if(_.isString(resolver) ) {
            resolverName = resolver;
            resolverFile = resolverName + ".js";
        }
        else if( _.isObject(resolver) &&
                 resolver.name) {
            resolverName = resolver.name;
            resolverFile = resolver.file;
        } else {
            // error
            logger.warn("Service \""+service.name+"\" resolver ("+resolver+") invalid");
            return;
        }

        // resolver NOT already loaded
        if(!service.resolver[resolverName]) {
            if (resolverFile) {
                // try to load controller as file
                if (fs.existsSync(resolverFile)) {
                    resolverClass = require(resolverFile);
                } else {
                    // default "<service.directory>/resolvers/<template>"
                    resolverFile = path.normalize(service.directory.resolvers + path.sep + resolverName + ".js");
                    if (fs.existsSync(resolverFile)) {
                        // need to add the current cwd because require is relative to this file
                        resolverClass = require(resolverFile);
                    } else {
                        // error
                        logger.warn("Service \"" + service.name + "\" resolver (" + resolver + ") invalid");
                        return;
                    }
                }
            }

            // TODO: dependency injection
            if (_.isFunction(resolverClass)) {
                service.resolver[resolverName] = new resolverClass(service.instance, service.options[ resolverName ]);
            } else {
                service.resolver[resolverName] = resolverClass;
            }
        }

        //
        if( service.resolver[resolverName][resolverBindName] &&
            _.isFunction(service.resolver[resolverName][resolverBindName]) ) {
            resolve[resolverBindName] = service.resolver[resolverName][resolverBindName];
        } else {
            logger.warn("Service \""+service.name+"\" resolver function ("+service.resolver[resolverName][resolverBindName]+") invalid");
        }
    }.bind(this));

    return resolve;
};


ServiceManager.prototype._loadServiceFile = function(key, directory) {
    var file = "";

    // try to loading service file
    file = directory + path.sep + key + ".js";

    // check if file exists
    if (fs.existsSync(file)) {
        return require(file);
    } else {
        // try to loading service file
        file = directory + path.sep + "service." + key + ".js";

        // check if file exists
        if (fs.existsSync(file)) {
            return require(file);
        } else {
            if(this._displayDebuggerInfo) {
                logger.info("Could not find service file \"" + key + "\" (" + file + ")");
            }
        }
    }

    return null;
};

ServiceManager.prototype._loadView = function(service, route, routeStr) {
    if( !route.hasOwnProperty('template')) {
        logger.warn("Template missing from route view", routeStr);
        return;
    }

    var templateData = "";
    // get all 'template' middleware
    var templateMiddleware = this._middleware.getAll('template');
    var templateDefaultMW  = this._middleware.getDefault('template');

    // if not object
    if( !_.isObject(route.template)) {
        if( !_.isString(route.template)) {
            logger.warn("Template is not 'object' or 'string' type, in route view", routeStr, " - template:", route.view.template);
            return;
        }

        // convert template to object
        var templateData = route.template;
        var templateType = null;

        if(templateMiddleware) {
            _.forEach(templateMiddleware, function(template, templateName) {
                // try to detect template type, using template data
                if( template.isValidData &&
                    _.isFunction(template.isValidData) &&
                    template.isValidData(templateData) ) {
                    templateType = templateName;
                }
            }.bind(this));
        }

        if(!templateType) {
            // TODO: should this be a feature to try and load as file?
        }

        route.template = {
            type: templateType,
            data: templateData
        }
    }

    // no template type
    if(!route.template.hasOwnProperty('type')) {

        var fileExt = '';
        // try to detect type based on file extension
        if(route.template.hasOwnProperty('file')) {
            fileExt = util.getFileExtension(route.template.file);
        }

        if(fileExt.length) {

            if(templateMiddleware) {
                _.forEach(templateMiddleware, function(template, templateName) {
                    // try to detect template type using file extention
                    if( template.isValidFileExtension &&
                        _.isFunction(template.isValidFileExtension) &&
                        template.isValidFileExtension(fileExt) ) {
                        route.template.type = templateName;
                    }
                }.bind(this));
            }
        } else {
            // all else fails, assume it's ejs
            route.template.type = templateDefaultMW.name;
        }
    }

    if(route.template.hasOwnProperty('file')) {
        var templateFile = route.template.file;
        var loadedTemplateFile = true;

        if( !fs.existsSync(templateFile) ) {
            // default "<service.directory>/views/<template>"
            templateFile = path.normalize(service.directory.views + path.sep + route.template.file);
            if( !fs.existsSync(templateFile) ) {
                logger.warn("Could not find Template", route.template.file, "at", templateFile);
                return;
            }
        }

        if(loadedTemplateFile) {
            templateData = fs.readFileSync(templateFile, 'utf8');
        }
    }
    else if(route.template.hasOwnProperty('data')) {
        templateData = route.template.data;
    }


    var templateFunc = null;
    // get template middleware
    var templateMiddleware = this._middleware.get('template', route.template.type);
    if( templateMiddleware &&
        _.isFunction(templateMiddleware.compile)) {
        // compile template
        templateFunc = templateMiddleware.compile(templateData);
    } else {
        logger.warn("Unknown template type:", route.template.type, ", in route view", routeStr);
        return templateFunc;
    }

    return templateFunc;
};

/*
 * API:
 *      [required (middleware)] -> [input validator] -> [pre (middleware)] -> [resolve] -> controller method -> [post (middleware)] -> OUT (json)
 *
 * View:
 *      [required (middleware)] -> [input validator] -> [pre (middleware)] -> [resolve] -> controller method -> [post (middleware)] -> template (middleware) -> OUT (html)
 */
ServiceManager.prototype.setupDynamicRoute = function(type, service, controller, route) {
    var routeStr = route.api || route.view || "";

    if(!routeStr) {
        logger.warn("Controller", type, "value invalid");
        return;
    }

    // TOOD: move this per method
    var templateFunc = null;
    if( type == "view" ){
        templateFunc = this._loadView(service, route, routeStr);
    }

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
                    '$input':       ['factory', this._httpFramework.buildInputs]
                };

                // add resolved to DI
                _.forEach(resolved, function(value, key) {
                    module[key] = ['value', value];
                }.bind(this));

                this._injectionDependency(module, controller, cFunc);
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

ServiceManager.prototype._addStaticRoute = function(service, staticContent, route) {

    // if staticContent is array call self with array value
    if( _.isArray(staticContent) ) {
        var ok = false;
        for(var i = 0; i < staticContent.length; i++) {
            ok = (this._addStaticRoute(service, staticContent[i]) || ok);
        }
        return ok;
    } else {

        try {
            if (!fs.existsSync(staticContent)) {
                staticContent = path.normalize(service.directory.static + path.sep + staticContent);
            }

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
    logger.log("Static Route:", route.static);

    this._addStaticRoute(service, route.static);
};

ServiceManager.prototype._setupRedirectRoute = function(service, route) {
    logger.log("Redirect Route:", route.redirect.from, "->" , route.redirect.to);

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


ServiceManager.prototype._setupDefaultRoute = function(service, defaultConfig) {

    if(defaultConfig.hasOwnProperty('static')) {
        this._addStaticRoute(service, defaultConfig.static);
    }
    else if(defaultConfig.hasOwnProperty('redirect')) {
        if(!defaultConfig.redirect.from) {
            defaultConfig.redirect.from = '/*'
        }
        this._setupRedirectRoute(service, defaultConfig);
    }
    else if(defaultConfig.hasOwnProperty('root')) {
        logger.log("Root:", defaultConfig.root);
        this._addStaticRoute(service, defaultConfig.root, "/");
    } else {
        // all others -> DEFAULT
        defaultConfig.root = '/index.html';
        logger.log("Default:", defaultConfig.root);
        this._httpFramework.addStaticFileDefault(defaultConfig.root);
    }
};


ServiceManager.prototype._loadDefaultServiceMiddleware = function(service){
    // TODO: load all file from middleware dir from service
    /*

     // try loading from service dir
     // <service root>/middleware/<Middleware file name>.js
     // Example: ./lib/middleware/handlebars.js
     file = path.normalize(serviceDir + path.sep + "middleware" + path.sep + MiddlewareFileName + ".js");
     if(fs.existsSync(file)) {
     MiddlewareClass = require(file);
     }

     */
    // this._middleware
};
