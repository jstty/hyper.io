'use strict';

/**
 * Manager for Services
 *
 */

var _create = require('babel-runtime/core-js/object/create');

var _create2 = _interopRequireDefault(_create);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var fs = require('fs');
var http = require('http');
var path = require('path');
//
var _ = require('lodash');
var when = require('when');
var di = require('di');
var glob = require('glob');

var util = require('./util.js');
var defaultAppService = require('./default.service.app.js');
//
var ServiceManagerConfig = require('./manager.service.config.js'); // Normalize Service Configs
var ServiceRouter = require('./router.service.js');
var ResourceHandler = require('./handler.resource.js');

var logger = null;

module.exports = ServiceManager;

/** ---------------------------------------------------
 * Public Functions
 * --------------------------------------------------- */

var Service = function () {
    function Service() {
        (0, _classCallCheck3.default)(this, Service);
    }

    (0, _createClass3.default)(Service, [{
        key: 'init',

        /**
         * initialize service
         */
        value: function init() {}
        // TODO


        /**
         * load service routes into http framework
         */

    }, {
        key: 'load',
        value: function load() {}
        // TODO


        /**
         * adds route to http framework
         * @param routeConfig
         */

    }, {
        key: 'addRoute',
        value: function addRoute(routeConfig) {}
        // TODO


        /**
         * adds resource to service
         * @param resourceConfig
         */

    }, {
        key: 'addResource',
        value: function addResource(resourceConfig) {
            // TODO
        }
    }]);
    return Service;
}();

var _ServiceManager = function () {
    function _ServiceManager() {
        (0, _classCallCheck3.default)(this, _ServiceManager);
    }

    (0, _createClass3.default)(_ServiceManager, [{
        key: 'init',

        /**
         * initialize services
         * load config
         * normalize service configs
         * check files exist
         * any prep before loading the service into the http framework
         */
        value: function init() {}
        // TODO

        // load service plugins
        //   - dynamic (api)
        //   - template (view)
        //   - static
        //   - redirect
        //   - otherwise
        //   - auth
        //   - ...


        /**
         * load services routes into http framework
         * mostly a config to -> addService helper
         */

    }, {
        key: 'load',
        value: function load() {}
        // TODO


        /**
         * adds a service to the manager
         * adds all routes defined in the config to http framework
         * @param serviceConfig
         * @returns Service Object
         */

    }, {
        key: 'add',
        value: function add(serviceConfig) {}
        // TODO


        /**
         * get Service Object from serviceId
         * @param serviceId
         * @returns Service Object
         */

    }, {
        key: 'get',
        value: function get(serviceId) {
            // TODO
        }
    }]);
    return _ServiceManager;
}();

/* ---------------------------------------------------
 * Constructor
 * --------------------------------------------------- */


function ServiceManager(hyperCore, appConfig, servicesManifest, middleware, serviceMiddlewareManager, httpFramework, defaultAppName) {

    var serviceManagerConfig = appConfig.serviceManager;
    this._displayDebuggerInfo = serviceManagerConfig.displayDebuggerInfo;
    this._hyperCore = hyperCore;
    // TODO: remove this after DI in it's own lib
    this._httpFramework = httpFramework;

    // Init Service Router
    this._serviceRouter = new ServiceRouter({
        port: this._httpFramework.port(),
        protocol: this._httpFramework.protocol()
    });

    // TODO: statsD
    //this.stats     = new util.Stats(this.options, "ServiceManager");
    logger = util.logger('Services');

    var manifest = new ServiceManagerConfig(defaultAppName, servicesManifest); // normalizes the configs
    this._servicesManifest = manifest.get();
    this._servicesManifest.shared = appConfig.shared;

    var servicesConfigs = {};
    _.forEach(this._servicesManifest.services, function (service, key) {
        service.config = _.merge(service.config, appConfig[key] || {});
        servicesConfigs[key] = service.config;
    });
    this._serviceRouter.config(servicesConfigs);

    this._services = {};
    this._resources = {};

    this._serviceMiddlewareManager = serviceMiddlewareManager;
    this._serviceMiddlewareManager.init(logger, httpFramework, middleware, this);
    //this._serviceMiddlewareManager = new ServiceMiddlewareManager(logger, httpFramework, middleware, this);
    //this._serviceMiddlewareManager.add('defaultRoutes');
    //this._serviceMiddlewareManager.add('apiviewRoutes');
}

/* ---------------------------------------------------
 * Public Functions
 * --------------------------------------------------- */
ServiceManager.prototype.getServiceRouter = function () {
    return this._serviceRouter;
};

// load all services
ServiceManager.prototype.loadHttpFramework = function () {
    return this._httpFramework.load();
};

// load all services
ServiceManager.prototype.loadServices = function () {
    return this._loadServices();
};

ServiceManager.prototype._loadServices = function () {

    logger.log('---------------------------------------------');
    logger.group("Loading Services...");

    var serviceList = _.values(this._servicesManifest.services);
    serviceList.reverse();
    serviceList.push({});

    return when.reduceRight(serviceList, function (notUsed, serviceManifest, index) {
        var service = this._services[serviceManifest.name] = {};

        service.name = serviceManifest.name;
        service.config = serviceManifest.config || {};
        service.options = serviceManifest.options || {};
        service.routes = serviceManifest.routes || {};
        service.preRoutes = serviceManifest.preRoutes;
        service.controller = {};
        service.resolver = {};
        service.directory = serviceManifest.directory || { service: "", controllers: "", resolvers: "", views: "", static: "" };
        service.resources = {};

        service._promiseQueue = [];

        // add service to service router
        this._serviceRouter.add(service.name);

        // module default: "./<directory>/<service name>.js"
        if (!serviceManifest.module) {
            service.module = this._loadServiceFile(service.name, service.directory.service);

            if (!service.module || !_.isFunction(service.module)) {
                // use default
                service.module = defaultAppService;
            }
        } else {
            service.module = serviceManifest.module;
        }

        // create instance of module
        if (service.module) {
            logger.group("Loading Service " + service.name + "...");

            var module = {
                '$resource': ['value', this._getResourceHandler(service)],
                '$logger': ['value', util.logger(service.name)]
            };

            if (service && service.hasOwnProperty('options')) {
                module.$options = ['value', service.options];
            }

            var InjectedModule = this._injectionDependency(module, service, service);
            service.instance = new InjectedModule();

            if (_.isFunction(service.instance.$init)) {
                logger.info("Initializing...");
                try {
                    var result = this._injectionDependency(module, service, service.instance, service.instance.$init);

                    // is promise
                    if (_.isObject(result) && _.isFunction(result.then)) {
                        service._promiseQueue.push(result);
                    }
                } catch (err) {
                    logger.error("Initializing Service Error:", err);
                    return when.reject(err);
                }
            }

            // create instance of module
            if (service.module && service.preRoutes && _.isFunction(service.preRoutes)) {
                logger.group("Loading PreRoutes...");
                // DI invoke preRoutes
                this._injectionDependency({}, service, service, service.preRoutes);
                logger.groupEnd(" ");
            }

            var p;
            if (service.module) {
                logger.group("Loading Setup Routes...");
                // setup service routes
                p = this._setupRoutes(service);
                service._promiseQueue.push(p);
                logger.groupEnd(" ");
            }

            // wait for Q'd resources to resolve before letting service resolve
            if (service._promiseQueue.length) {
                //logger.info("Wait for Setup...");

                // TODO: need timeout in case resource promise never resolves
                return when.all(service._promiseQueue).then(function () {
                    delete service._promiseQueue;
                    //logger.info("Route Setup Complete");
                    logger.groupEnd(" ");
                }.bind(this));
            } else {
                logger.groupEnd(" ");

                return 1;
            }
        }

        if (this._displayDebuggerInfo) {
            logger.info('services["%s"]: %s', key, (0, _stringify2.default)(service, null, 2));
        }
    }.bind(this));
};

// run all post start init on services
ServiceManager.prototype.postStartInit = function () {

    var serviceList = _.values(this._services);
    serviceList.reverse();
    serviceList.push({});

    return when.reduceRight(serviceList, function (notUsed, service) {
        logger.group("Running Service " + service.name + " Post Start Init...");

        service._promiseQueue = [];

        if (_.isFunction(service.instance.$postStartInit)) {
            try {
                var result = this._injectionDependency(module, service, service.instance, service.instance.$postStartInit);

                // is promise
                if (_.isObject(result) && _.isFunction(service._promiseQueue.then)) {
                    service._promiseQueue.push(result);
                }
            } catch (err) {
                logger.error("Post Start Init Service Error:", err);
                return when.reject(err);
            }
        }

        _.forEach(service.resources, function (resource) {
            if (_.isFunction(resource.instance.$postStartInit)) {
                try {
                    var result = this._injectionDependency(module, service, resource.instance, resource.instance.$postStartInit);

                    // is promise
                    if (_.isObject(result) && _.isFunction(result.then)) {
                        service._promiseQueue.push(result);
                    }
                } catch (err) {
                    logger.error("Post Start Init Service Error:", err);
                    return when.reject(err);
                }
            }
        }.bind(this));

        // wait for Q'd resources to resolve before letting service resolve
        if (service._promiseQueue.length) {
            logger.info("Wait Post Start Init...");

            // TODO: need timeout in case resource promise never resolves
            return when.all(service._promiseQueue).then(function () {
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

ServiceManager.prototype.addResource = function (name, resourceModule, type, service) {
    if (!type) {
        type = 'factory';
    }

    if (!_.isString(name)) {
        logger.error("argument1 ('name') needs to be a string");
    }

    if (!resourceModule) {
        resourceModule = name;
    }

    logger.log('Adding Resource "%s"', name);

    // if string try to load file
    if (_.isString(resourceModule)) {
        // load resource from file
        resourceModule = this._loadResourceFile(name, resourceModule);
    }

    if (type == 'factory') {
        if (_.isFunction(resourceModule)) {

            var module = {};
            var InjectedModule = this._injectionDependency(module, service, {
                module: resourceModule
            });
            resourceModule = new InjectedModule();

            // run $init function
            if (_.isFunction(resourceModule.$init)) {
                try {
                    var result = this._injectionDependency(module, service, resourceModule, resourceModule.$init);

                    // is promise
                    if (_.isObject(result) && _.isFunction(result.then)) {
                        service._promiseQueue.push(result);
                    }
                } catch (err) {
                    logger.error("Loading Middleware Error:", err);
                    return null;
                }
            }
        } else {
            logger.error("argument2 ('resource') needs to be a function/module");
        }
    }

    if (_.isObject(resourceModule)) {

        if (!service) {
            this._resources[name] = {
                module: resourceModule,
                instance: resourceModule
            };
        } else {
            service.resources[name] = {
                module: resourceModule,
                instance: resourceModule
            };
        }
    } else {
        logger.info("Could not find or load resource '%s'", name);
    }

    return resourceModule;
};

ServiceManager.prototype._getResourceHandler = function (service) {
    return new ResourceHandler(this, service);
};

ServiceManager.prototype._loadResourceFile = function (name, file) {
    var mod = null;
    var type = 'resource';

    var tmpFile = path.join(process.cwd(), file);
    if (fs.existsSync(tmpFile)) {
        try {
            return require(tmpFile);
        } catch (err) {}
    }

    mod = this._loadFile(type, name, file);
    if (mod) {
        return mod;
    }

    mod = this._loadFile(type, name, '.');
    if (mod) {
        return mod;
    }

    for (var key in this._services) {
        mod = this._loadFile(type, name, this._services[key].directory.service);
        if (mod) {
            return mod;
        }
    }

    return null;
};

ServiceManager.prototype._loadFile = function (type, key, directory) {
    var file = "";

    // try to loading service file
    file = directory + path.sep + key + ".js";
    file = path.join(process.cwd(), file);
    //logger.info('Trying to load:', file);

    // check if file exists
    if (fs.existsSync(file)) {
        try {
            return require(file);
        } catch (err) {}
    } else {
        // try to loading service file
        file = directory + path.sep + type + "." + key + ".js";
        file = path.join(process.cwd(), file);
        //logger.info('Trying to load:', file);

        // check if file exists
        if (fs.existsSync(file)) {
            try {
                return require(file);
            } catch (err) {}
        }
    }

    return null;
};

/* ---------------------------------------------------
 * Private Functions
 * --------------------------------------------------- */

ServiceManager.prototype._setupRoutes = function (service) {
    return when.reduce(service.routes, function (notUsed, route) {

        // return controller created or from cache
        var controller = this._setupController(service, route);
        if (this._displayDebuggerInfo) {
            logger.info("Controller:", (0, _stringify2.default)(controller, null, 2));
        }

        // Setup Resolver, if they exist
        route.resolve = this._setupResolver(service, route);

        // switch based on the properties
        var p = null;
        if (this._serviceMiddlewareManager.hasHandler(route)) {
            p = this._serviceMiddlewareManager.setup(service, controller, route);
        }
        //else if( route.hasOwnProperty('api')) {
        //    p = this.setupDynamicRoute("api", service, controller, route);
        //}
        //else if( route.hasOwnProperty('view')) {
        //    p = this.setupDynamicRoute("view", service, controller, route);
        //}
        else {
                logger.warn("Service \"" + service.name + "\" has invalid route", route);
            }

        // if 'p' null then return resolved promise
        return p || when.resolve();
    }.bind(this), 0);
};

ServiceManager.prototype._setupController = function (service, route) {
    var controller;
    var controllerName = service.name;

    // no controller, this is ok
    // create default controller
    if (!route.controller) {
        if (this._displayDebuggerInfo) {
            logger.info("Controller missing for", service.name);
        }

        service.controller[controllerName] = {
            name: controllerName,
            config: service.config,
            module: function module() {},
            instance: function instance() {}
        };
        service.controller[controllerName].instance.config = service.config;

        return service.controller[controllerName];
    } else if (_.isString(route.controller)) {
        controllerName = route.controller;
    } else if (_.isObject(route.controller) && route.controller.hasOwnProperty('name')) {
        controllerName = route.controller.name;
    }

    if (service.controller[controllerName]) {
        // controller already loaded
        return service.controller[controllerName];
    } else {
        // create one, required data should be filled in the section below
        service.controller[controllerName] = {};
    }

    logger.info("Loading Controller:", controllerName);
    if (_.isString(route.controller)) {
        // try to load controller as file
        var file = route.controller;
        controller = null;
        if (fs.existsSync(file)) {
            try {
                controller = require(file);
            } catch (err) {
                logger.error("Loading Service \"" + service.name + "\" controller (" + route.controller + ") Error:", err);
            }
        }

        if (!controller) {
            // controller default: "<service.directory>/controllers/<controller>.js"
            file = path.normalize(service.directory.controllers + path.sep + route.controller + ".js");
            //logger.log("setupController file:", file);
            if (fs.existsSync(file)) {
                // need to add the current cwd because require is relative to this file
                try {
                    controller = require(file);
                } catch (err) {
                    logger.error("Loading Service \"" + service.name + "\" controller (" + route.controller + ") Error:", err);
                }
            }
        }

        if (!controller) {
            // error
            logger.warn("Service \"" + service.name + "\" controller (" + route.controller + ") invalid");
            return;
        } else {
            service.controller[controllerName].module = controller;
            logger.info("Loaded Controller:", controllerName);
        }
    } else if (_.isObject(route.controller)) {
        if (route.controller.hasOwnProperty('module') && route.controller.hasOwnProperty('instance')) {
            service.controller[controllerName] = route.controller;
        } else {
            service.controller[controllerName].module = route.controller;
        }
    } else {
        // error
        logger.warn("Service \"" + service.name + "\" controller (" + route.controller + ") invalid");
        return;
    }

    // if controller does not have a config then pass service along
    if (!service.controller[controllerName].hasOwnProperty('config')) {
        service.controller[controllerName].config = service.config;
    }

    // make sure controller has name
    if (!service.controller[controllerName].name) {
        service.controller[controllerName].name = controllerName;
    }

    if (!service.controller[controllerName].instance) {
        if (_.isFunction(service.controller[controllerName].module)) {
            var module = {
                '$service': ['value', service.instance],
                '$options': ['value', service.options[controllerName]],
                '$logger': ['value', util.logger(service.name + ' - ' + controllerName)] // TODO: add logger to controller object
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

/**
 * Inject Dependancies
 * TODO: move this to it's own lib
 * @param module
 * @param service
 * @param parent
 * @param func
 * @returns {*}
 * @private
 */
ServiceManager.prototype._injectionDependency = function (module, service, parent, func) {
    // ---------------------------------------
    // injection dependency to Controller function
    // NOTE: di does not work when you use cFunc.bind(...) as it hides the function arguments
    module = _.merge({
        '$logger': ['value', logger],
        '$q': ['value', when],
        '_': ['value', _],
        '$hyper': ['value', this._hyperCore],
        '$services': ['value', this._serviceRouter],
        '$http': ['value', this._httpFramework],
        '$sharedConfig': ['value', this._servicesManifest.shared]
    }, module);

    if (parent && parent.hasOwnProperty('config')) {
        module.$config = ['value', parent.config];
    } else if (service && service.hasOwnProperty('config')) {
        module.$config = ['value', service.config];
    }

    // add all _resources to list for DI
    var rKey = null;
    for (rKey in this._resources) {
        module[rKey] = ['value', this._resources[rKey].instance];
    }

    // add all service.resources to list for DI
    if (service) {
        for (rKey in service.resources) {
            module[rKey] = ['value', service.resources[rKey].instance];
        }
    }

    // creates injector
    var injector = new di.Injector([module]);

    // run function
    if (func) {
        if (parent) {
            return injector.invoke(func, parent);
        } else {
            return injector.invoke(func);
        }
    } else {
        if (parent) {
            if (parent.module.toString().indexOf('function') === 0) {
                var InjectedWrapper = function InjectedWrapper() {
                    return injector.invoke(parent.module, this);
                };
                //InjectedWrapper.prototype = _.merge(InjectedWrapper.prototype, parent.module.prototype);
                InjectedWrapper.prototype = (0, _create2.default)(parent.module.prototype);

                return InjectedWrapper;
            } else {
                return injector.invoke(parent.module, this);
            }
        }
    }
    // ---------------------------------------
};

ServiceManager.prototype._setupResolver = function (service, route) {
    var resolver;
    var resolve = {};

    if (!route.resolve) {
        // no resolver, this is ok
        return;
    } else if (!_.isObject(route.resolve)) {
        logger.warn("Service \"" + service.name + "\" resolver (" + route.resolve + ") invalid");
        return;
    }

    _.forEach(route.resolve, function (resolver, resolverBindName) {
        var resolverName = 'defaultResolver';
        var resolverFile = null;
        var ResolverClass = null;

        if (_.isString(resolver)) {
            resolverName = resolver;
            resolverFile = resolverName + ".js";
        } else if (_.isObject(resolver) && resolver.name) {
            resolverName = resolver.name;
            resolverFile = resolver.file;
        } else {
            // error
            logger.warn("Service \"" + service.name + "\" resolver (" + resolver + ") invalid");
            return;
        }

        // resolver NOT already loaded
        if (!service.resolver[resolverName]) {
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
                service.resolver[resolverName] = new ResolverClass(service.instance, service.options[resolverName]);
            } else {
                service.resolver[resolverName] = ResolverClass;
            }
        }

        //
        if (service.resolver[resolverName][resolverBindName] && _.isFunction(service.resolver[resolverName][resolverBindName])) {
            resolve[resolverBindName] = service.resolver[resolverName][resolverBindName];
        } else {
            logger.warn("Service \"" + service.name + "\" resolver function (" + service.resolver[resolverName][resolverBindName] + ") invalid");
        }
    }.bind(this));

    return resolve;
};

ServiceManager.prototype._loadServiceFile = function (key, directory) {
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
            if (this._displayDebuggerInfo) {
                logger.info("Could not find service file \"" + key + "\" (" + file + ")");
            }
        }
    }

    return null;
};