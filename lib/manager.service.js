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

var util                 = require('./util.js');
var defaultAppService    = require('./default.service.app.js');
//
var ServiceManagerConfig = require('./manager.service.config.es6'); // ES6
var ServiceRouter        = require('./router.service.js');
var ResourceHandler      = require('./handler.resource.js');

var logger = null;

module.exports = ServiceManager;

/* ---------------------------------------------------
 * Constructor
 * --------------------------------------------------- */
function ServiceManager(
    hyperCore,
    appConfig,
    servicesManifest,
    middleware,
    httpFramework,
    defaultAppName) {

    var serviceManagerConfig = appConfig.serviceManager;
    this._displayDebuggerInfo = serviceManagerConfig.displayDebuggerInfo;
    this._hyperCore = hyperCore;
    this._httpFramework = httpFramework;

    // Init Service Router
    this._serviceRouter = new ServiceRouter({
        port:     this._httpFramework.port(),
        protocol: this._httpFramework.protocol()
    });

    // TODO: statsD
    //this.stats     = new util.Stats(this.options, "ServiceManager");
    logger = util.logger('Services');

    var manifest = new ServiceManagerConfig(defaultAppName, servicesManifest); // normalizes the configs
    this._servicesManifest = manifest.get();

    var servicesConfigs = {};
    _.forEach(this._servicesManifest.services, function(service, key){
        service.config = _.merge(service.config, appConfig[key] || {});
        servicesConfigs[key] = service.config;
    });
    this._serviceRouter.config( servicesConfigs );

    this._services  = {};

    this._middleware = middleware;

    this._resources = {};
}

/* ---------------------------------------------------
 * Public Functions
 * --------------------------------------------------- */
ServiceManager.prototype.getServiceRouter = function() {
    return this._serviceRouter;
};

// load all services
ServiceManager.prototype.loadHttpFramework = function() {
    return this._httpFramework.load();
};

// load all services
ServiceManager.prototype.loadServices = function() {
    return this._loadServices();
};

ServiceManager.prototype._loadServices = function() {

    logger.log('---------------------------------------------');
    logger.group("Loading Services...");

    var serviceList = _.values(this._servicesManifest.services);
    serviceList.reverse();
    serviceList.push({});

    return when
      .reduceRight(serviceList,
      function(notUsed, serviceManifest, index) {
        var service = this._services[serviceManifest.name] = {};

        service.name        = serviceManifest.name;
        service.config      = serviceManifest.config  || {};
        service.options     = serviceManifest.options || {};
        service.routes      = serviceManifest.routes  || {};
        service.preRoutes   = serviceManifest.preRoutes;
        service.controller  = {};
        service.resolver    = {};
        service.directory   = serviceManifest.directory || { service: "", controllers: "", resolvers: "", views: "", static: ""};
        service.resources   = {};

        service._promiseQueue = [];

        // add service to service router
        this._serviceRouter.add(service.name);

        // module default: "./<directory>/<service name>.js"
        if(!serviceManifest.module) {
            service.module = this._loadServiceFile(service.name, service.directory.service);

            if( !service.module ||
                !_.isFunction(service.module)) {
                // use default
                service.module = defaultAppService;
            }
        } else {
            service.module = serviceManifest.module;
        }

        // create instance of module
        if( service.module ) {
          logger.group("Loading Service " + service.name + "...");

          var module = {
            '$resource': ['value', this._getResourceHandler(service)],
            '$logger': ['value', util.logger(service.name)]
          };

          if (service &&
            service.hasOwnProperty('options')) {
            module.$options = ['value', service.options];
          }

          var InjectedModule = this._injectionDependency(module, service, service);
          service.instance = new InjectedModule();

          if(_.isFunction(service.instance.$init)) {
              logger.info("Initializing...");
              try {
                  var result = this._injectionDependency(module, service, service.instance, service.instance.$init);

                  // is promise
                  if(_.isObject(result) && _.isFunction(result.then)) {
                      service._promiseQueue.push(result);
                  }
              }
              catch(err) {
                  logger.error("Initializing Service Error:", err);
                  return when.reject(err);
              }
          }

          // create instance of module
          if( service.module &&
              service.preRoutes &&
              _.isFunction(service.preRoutes) ) {
            logger.group("Loading PreRoutes...");
            // DI invoke preRoutes
            this._injectionDependency({}, service, service, service.preRoutes);
            logger.groupEnd(" ");
          }

          if( service.module ) {
            logger.group("Loading Setup Routes...");
            // setup service routes
            this._setupRoutes(service);
            logger.groupEnd(" ");
          }

          // wait for Q'd resources to resolve before letting service resolve
          if (service._promiseQueue.length) {
              logger.info("Wait for Resources...");

              // TODO: need timeout in case  resource promise never resolves
              return when
                .all(service._promiseQueue)
                .then(function () {
                    delete service._promiseQueue;
                    logger.info("Resources Loaded");
                    logger.groupEnd(" ");
                }.bind(this));
          } else {
              logger.groupEnd(" ");

              return 1;
          }
        }

        if(this._displayDebuggerInfo) {
            logger.info('services["%s"]: %s', key, JSON.stringify(service, null, 2));
        }
    }.bind(this));
};


// run all post start init on services
ServiceManager.prototype.postStartInit = function() {

  var serviceList = _.values(this._services);
  serviceList.reverse();
  serviceList.push({});

  return when
    .reduceRight(serviceList,
    function(notUsed, service){
    logger.group("Running Service " + service.name + " Post Start Init...");

    service._promiseQueue = [];

    if(_.isFunction(service.instance.$postStartInit)) {
      try {
        var result = this._injectionDependency(module, service, service.instance, service.instance.$postStartInit);

        // is promise
        if(_.isObject(result) && _.isFunction(service._promiseQueue.then)) {
          service._promiseQueue.push(result);
        }
      }
      catch(err) {
        logger.error("Post Start Init Service Error:", err);
        return when.reject(err);
      }
    }

    _.forEach(service.resources, function(resource){
      if(_.isFunction(resource.instance.$postStartInit)) {
        try {
          var result = this._injectionDependency(module, service, resource.instance, resource.instance.$postStartInit);

          // is promise
          if(_.isObject(result) && _.isFunction(result.then)) {
            service._promiseQueue.push(result);
          }
        }
        catch(err) {
          logger.error("Post Start Init Service Error:", err);
          return when.reject(err);
        }
      }
    }.bind(this));

    // wait for Q'd resources to resolve before letting service resolve
    if (service._promiseQueue.length) {
      logger.info("Wait Post Start Init...");

      // TODO: need timeout in case  resource promise never resolves
      return when
        .all(service._promiseQueue)
        .then(function () {
          delete service._promiseQueue;

          logger.info("Loaded");
          logger.groupEnd(" ");
        }.bind(this));
    } else {
      logger.groupEnd(" ");

      return 1;
    }

  }.bind(this));

};



ServiceManager.prototype.addResource = function(name, resourceModule, type, service) {
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

            var module = {};
            var InjectedModule = this._injectionDependency(module, service, {
                module: resourceModule
            });
            resourceModule = new InjectedModule();


            // run $init function
            if(_.isFunction(resourceModule.$init)) {
                try {
                    var result = this._injectionDependency(module, service, resourceModule, resourceModule.$init);

                    // is promise
                    if(_.isObject(result) && _.isFunction(result.then)) {
                        service._promiseQueue.push(result);
                    }
                }
                catch(err) {
                    logger.error("Loading Middleware Error:", err);
                    return null;
                }
            }

        } else {
            logger.error("argument2 ('resource') needs to be a function/module");
        }
    }

    if(_.isObject(resourceModule)) {

        if(!service) {
            this._resources[name] = {
                module:   resourceModule,
                instance: resourceModule
            };
        } else {
            service.resources[name] = {
                module:   resourceModule,
                instance: resourceModule
            };
        }

    } else {
        logger.info("Could not find or load resource '%s'", name);
    }

    return resourceModule;
};


ServiceManager.prototype._getResourceHandler = function(service) {
    return new ResourceHandler(this, service);
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

        if( route.hasOwnProperty('api')) {
            this.setupDynamicRoute("api", service, controller, route);
        }
        else if( route.hasOwnProperty('view')) {
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
            //logger.log("setupController file:", file);
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

    // make sure controller has name
    if(!service.controller[controllerName].name) {
        service.controller[controllerName].name = controllerName;
    }

    if(!service.controller[controllerName].instance) {
        if(_.isFunction(service.controller[controllerName].module)) {
            var module = {
                '$service':  ['value', service.instance],
                '$options':  ['value', service.options[ controllerName ] ],
                '$logger':   ['value', util.logger(service.name + ' - ' + controllerName)] // TODO: add logger to controller object
            };

            var InjectedModule = this._injectionDependency(module, service, service.controller[controllerName]);

            service.controller[controllerName].instance = new InjectedModule();
            //service.controller[controllerName].instance = new controller();
        } else {
            service.controller[controllerName].instance = controller;
        }
    }

    return service.controller[controllerName];
};

ServiceManager.prototype._injectionDependency = function(module, service, parent, func) {
    // ---------------------------------------
    // injection dependency to Controller function
    // NOTE: di does not work when you use cFunc.bind(...) as it hides the function arguments
    module = _.merge({
        '$logger':      ['value', logger],
        '$q':           ['value', when],
        '_':            ['value', _],
        '$hyper':       ['value', this._hyperCore],
        '$services':    ['value', this._serviceRouter],
        '$http':        ['value', this._httpFramework]
    }, module);

    if( parent &&
        parent.hasOwnProperty('config')) {
        module.$config = ['value', parent.config];
    }

    // add all _resources to list for DI
    var rKey = null;
    for(rKey in this._resources) {
        module[rKey] = ['value', this._resources[rKey].instance];
    }

    // add all service.resources to list for DI
    if(service) {
        for(rKey in service.resources) {
            module[rKey] = ['value', service.resources[rKey].instance];
        }
    }

    // creates injector
    var injector = (new di.Injector( [module] ) );

    // run function
    if(func) {
        if(parent) {
            return injector.invoke( func, parent );
        } else {
            return injector.invoke( func );
        }
    }
    else {
        if(parent) {
            var InjectedWrapper = function() {
                return injector.invoke( parent.module, this );
            };
            InjectedWrapper.prototype = _.merge(InjectedWrapper.prototype, parent.module.prototype);

            return InjectedWrapper;
        }
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
        var ResolverClass = null;

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
                    ResolverClass = require(resolverFile);
                } else {
                    // default "<service.directory>/resolvers/<template>"
                    resolverFile = path.normalize(service.directory.resolvers + path.sep + resolverName + ".js");
                    if (fs.existsSync(resolverFile)) {
                        // need to add the current cwd because require is relative to this file
                        ResolverClass = require(resolverFile);
                    } else {
                        // error
                        logger.warn("Service \"" + service.name + "\" resolver (" + resolver + ") invalid");
                        return;
                    }
                }
            }

            // TODO: dependency injection
            if (_.isFunction(ResolverClass)) {
                service.resolver[resolverName] = new ResolverClass(service.instance, service.options[ resolverName ]);
            } else {
                service.resolver[resolverName] = ResolverClass;
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
        templateData = route.template;
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
        };
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
            route.template.type = templateDefaultMW.getInfo().name;
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
    templateMiddleware = this._middleware.get('template', route.template.type);
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
                }

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

    if(errors.length === 0) {
        errors = undefined;
    }
    if(errors.length === 1) {
        errors = errors[0];
    }
    return errors;
};

ServiceManager.prototype._addStaticRoute = function(service, staticContent, route) {

    if( !_.isArray(staticContent) &&
        _.isObject(staticContent) ) {
        var staticRoute = staticContent;

        if( staticRoute.hasOwnProperty('from') &&
            staticRoute.hasOwnProperty('to') ) {
            staticContent = staticRoute.from;
            route         = staticRoute.to;
        }
        else {
            if( staticRoute.hasOwnProperty('root') ) {
                service.directory.service = staticRoute.root;
            }
            if( staticRoute.hasOwnProperty('cache') ) {
                // TODO
            }
            if( staticRoute.hasOwnProperty('list') ) {
                staticContent = staticRoute.list;
            }
        }
    }

    // if staticContent is array call self with array value
    if( _.isArray(staticContent) ) {
        var ok = false;
        for(var i = 0; i < staticContent.length; i++) {
            ok = (this._addStaticRoute(service, staticContent[i], route) || ok);
        }
        return ok;
    } else {
        try {
            if (!fs.existsSync(staticContent)) {
                staticContent = path.normalize(service.directory.service + path.sep + staticContent);
            }

            // check if file/dir exists
            if (fs.existsSync(staticContent)) {

                // get stats to see if file or dir
                var stats = fs.lstatSync(staticContent);

                if (stats.isDirectory()) {
                    //logger.log("Adding Static Dir Content -", staticContent);
                    logger.log("Static Dir Route:", staticContent, "->", route || '/');

                    this._httpFramework.addStaticDir(staticContent, route);
                    return true;
                } else {
                    //logger.log("Adding Static File -", staticContent);
                    logger.log("Static File Route:", staticContent, "->", route || staticContent);

                    // if route does not start with / then add one
                    if(route && route.charAt(0) !== '/') {
                        route = '/'+route;
                    }

                    if(!route) {
                        this._httpFramework.addStaticFileDefault(staticContent);
                    } else {
                        this._httpFramework.addStaticFile(route, staticContent);
                    }
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
    logger.group("Static Route");
    this._addStaticRoute(service, route.static);
    logger.groupEnd('');
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
            defaultConfig.redirect.from = '/*';
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
