'use strict';

/*
 *
 */
var path       = require('path');
var http       = require('http');

var _          = require('lodash');
var when       = require('when');
var Transfuser = require('transfuser');

//
var HttpFrameworkExpress = require('./http.framework.express.js');
//
var PluginManager  = require('yanpm');
var ServiceManager = require('./manager.service.js');
var ServiceMiddlewareManager = require('./service.middleware/service.middleware.manager.js');
var util           = require('./util.js');
var hyperConfigs   = require('./config.js');

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

function Hyper (options) {
  if (!(this instanceof Hyper)) {
        // singleton behavior
    if (!_hyper) {
      _hyper = new Hyper(options);
    }
    return _hyper;
  }

    // default options
  if (!options) {
    options = {};
  }

  this._displayDebuggerInfo = options.displayDebuggerInfo || false;

  // default
  var configs = [
    '$/config.js'     // framework dir (default)
  ];
  // get server filename
  this._defaultAppName = options.appName || path.basename(require.main.filename, '.js');

  // TODO: slim down this list
  configs.push('config.json'); // current dir
  configs.push('config.js');   // current dir
  configs.push(this._defaultAppName + '.config.json'); // current dir
  configs.push(this._defaultAppName + '.config.js');   // current dir

  configs.push('~/config.custom.json'); // home dir
  configs.push('~/config.custom.js');   // home dir
  configs.push('~/' + this._defaultAppName + '.config.custom.json'); // home dir
  configs.push('~/' + this._defaultAppName + '.config.custom.js'); // home dir

  // if options has configs array
  if (_.isArray(options.configs)) {
    // add configs array to end of list to merge
    configs = configs.concat(options.configs);
  }

  this._options = options;
  this._options.configs = configs;

  // TODO: add stats
  this._stats = null;
  this._httpFramework = null;
  this._httpServer = null;
  this._servicesManifest = {};
  this._isLoaded = false;

  // ------------------------------
  // normalize options
  this._options = _.merge(_.cloneDeep(hyperConfigs), this._options);
  this._options = this._normalizeOptions(this._options);
  // this._logger.info('options:', JSON.stringify(this._options, null, 2));
  // ------------------------------

  // set logger
  this._logger = util.logger(this._options.hyper.logger);

  // middleware manager
  this._pluginManager = new PluginManager({
    logger: this._logger
  });

  this._serviceMiddlewareManager = new ServiceMiddlewareManager();
  // default service middleware
  this._serviceMiddlewareManager.add('defaultRoutes');
  this._serviceMiddlewareManager.add('apiviewRoutes');

  // add catch all, just in case
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Error -', err, ', stack:', err.stack);
  });
}

Hyper.prototype.env = function (env) {
  if (env) {
    this._config.serviceManager.env = env;
    this._config.httpFramework.env = env;
  }

  return this._config.serviceManager.env;
};

Hyper.prototype._normalizeOptions = function (options) {
  if (options.env) {
    options.serviceManager.env = options.env;
    options.httpFramework.env = options.env;
    delete options.env;
  }
  if (_.isString(options.port)) {
    options.port = parseInt(options.port)
  }
  if (_.isInteger(options.port) && options.port >= 0) {
    options.httpFramework.port = options.port;
    delete options.port;
  }
  if (options.session) {
    options.httpFramework.session = options.session;
    delete options.session;
  }
  if (options.hasOwnProperty('displayDebuggerInfo')) {
    options.hyper.displayDebuggerInfo = options.displayDebuggerInfo;
    options.httpFramework.displayDebuggerInfo = options.displayDebuggerInfo;
    options.serviceManager.displayDebuggerInfo = options.displayDebuggerInfo;
    delete options.displayDebuggerInfo;
  }
  if (options.silent) {
    options.httpFramework.silent = true;
    options.serviceManager.silent = true;
    delete options.silent;

    options.serviceManager.env = 'prod';
    options.httpFramework.env = options.serviceManager.env;
    options.hyper.logger.env = options.serviceManager.env;
  }

  return options;
};

Hyper.prototype.logger = function () {
  return this._logger;
};

Hyper.prototype.resource = function (...args) {
  this._serviceManager.addResource(...args);
};

Hyper.prototype._loadConfigs = function (servicesManifest) {
  // config manager
  // logger not loaded, yet so we can only user console
  this._logger.group('Loading Configuration...');
  this._configManager = new Transfuser({
    basePath: __dirname,
    logger:   this._logger
  });
  // blocking, but this is ok because the server needs the configs to proceed
  this._config = this._configManager.loadSync(this._options.configs, !this._displayDebuggerInfo);
  // normalize configs
  this._config = this._normalizeOptions(this._config);
  this._logger.groupEnd('');

  // add options passed in from inits
  this._config.appName = this._options.appName;
  this._config.hyper = _.merge(this._config.hyper, this._options.hyper);
  this._config.serviceManager = _.merge(this._config.serviceManager, this._options.serviceManager);
  this._config.httpFramework = _.merge(this._config.httpFramework, this._options.httpFramework);
  // TODO: add to verbose
  // this._logger.info('config:', JSON.stringify(this._config, null, 2));

  //
  if (this._config.hyper.hasOwnProperty('displayDebuggerInfo')) {
    this._displayDebuggerInfo = this._config.hyper.displayDebuggerInfo;
  }

  // update logger options, using config
  this._logger.setOptions(this._config.hyper.logger);

  // service config
  this._servicesManifest = servicesManifest;
};

// load services
// return promise
Hyper.prototype.load = function (servicesManifest) {
  // add promise wrapper
  return when.promise(function (resolve) {
  // ------------------------------------------------
    this._isLoaded = true;

    this._loadConfigs(servicesManifest);

    this._initHttpFramework();

    // init service manager and router
    this._initServiceManager();

    // this._logger.info("process:", JSON.stringify(process.versions, null, 2));

    // done loading plugins, now load http framework
    this._serviceManager.loadHttpFramework()
        .then(function () {
          resolve(this);
        }.bind(this));
// ------------------------------------------------
  }.bind(this));
// end promise wrapper
};

Hyper.prototype.httpServerListen = function () {
// add promise wrapper
  return when.promise(function (resolve, reject) {
// ------------------------------------------------

    let listener = this._httpServer.listen(this._httpFramework.port(), function () {
      // set http framework internal port to match the port that is really running
      // for example, if port set to 0 (zero) the http server will randomlly assign a free port
      this._httpFramework.port(listener.address().port);
      this._logger.log('Listening on port %d', this._httpFramework.port());
      resolve();
    }.bind(this));

// ------------------------------------------------
  }.bind(this));
// end promise wrapper
};

// load all services and then start
Hyper.prototype._start = function () {
  return this._serviceManager.loadServices()
        .then(function () {
          return this.httpServerListen();
        }.bind(this))
        .then(function () {
          // only update if host '127.0.0.1' and port == 0
          // this is to fix and issue with port set to zero, the http server will auto set the port to a random free port
          this._serviceManager.getServiceRouter().updateInternalZeroPort(this._httpFramework.port());

          return this._serviceManager.postStartInit();
        }.bind(this))
        .then(function () {
          this._logger.log('---------------------------------------------');
          this._logger.log('Ready to accept connections on port', this._httpFramework.port());
          this._logger.log('---------------------------------------------');
          return this;
        }.bind(this));
};

Hyper.prototype.start = function (servicesManifest) {
  if (this._isLoaded) {
    return this._start();
  }
  else {
    return this.load(servicesManifest)
      .then(function () {
        return this._start();
      }.bind(this));
  }
};

Hyper.prototype.stop = function () {
// add promise wrapper
  return when.promise(function (resolve, reject) {
// ------------------------------------------------

    this._httpServer.close();
    resolve();

// ------------------------------------------------
  }.bind(this));
// end promise wrapper
};

// TODO: merge use and middleware
Hyper.prototype.use = function (MiddlewareGroup, MiddlewareName, option) {
  this._pluginManager.add(MiddlewareGroup, MiddlewareName, option);
};
Hyper.prototype.middleware = function (serviceMiddleware, serviceMiddlewareConfig) {
  this._serviceMiddlewareManager.add(serviceMiddleware, serviceMiddlewareConfig);
};

Hyper.prototype.httpFramework = function () {
  return this._httpFramework;
};

Hyper.prototype.httpServer = function () {
  return this._httpServer;
};

Hyper.prototype.services = function () {
  return this._serviceManager.getServiceRouter();
};

Hyper.prototype._initHttpFramework = function () {
  // load HTTP framework
  if (this._config.hyper.httpFramework === 'express') {
    // TODO: use DI to pass vars
    this._httpFramework = new HttpFrameworkExpress(this._config.httpFramework, this._logger, this._stats);
  }
  else {
    this._logger.error('Unknown HTTP Framework');
    return;
  }

  this._httpServer = http.Server(this._httpFramework.app());
};

Hyper.prototype._initServiceManager = function () {
    // service manager
  this._serviceManager = new ServiceManager(
        this,
        this._config,
        this._servicesManifest,
        this._pluginManager,
        this._serviceMiddlewareManager,
        this._httpFramework,
        this._defaultAppName);
};

Hyper.export = {};
Hyper.decor = {};
Hyper.classes = {};
Hyper.util = {};

Hyper.export.service = function (serviceName) {
  return ServiceManager.export(serviceName);
};

Hyper.util.extends = function (dest, src) {
  dest.prototype = Object.create(src.prototype);
  dest.prototype.constructor = dest;
  return src.prototype;
};

Hyper.decor.handler = function (config) {
  return function (target, key, descriptor) {
    if (!target.$route) {
      target.$route = {};
    }
    target.$route[key] = config;
  };
};

// TODO: finish this
Hyper.classes.controller = class {
  constructor () {
    this.$route = {};
  }

  $routeInit ($logger) {
        // create route object if not exist
    if (!this.$route) {
      this.$route = {};
    }

    var proto = Object.getPrototypeOf(this);
//       console.log('proto:', proto);

        // find list of all handler
    var pList = Object.getOwnPropertyNames(proto);
    var list = pList.filter(function (p) {
      return (p !== 'constructor') && (typeof this[p] === 'function');
    }.bind(this));
//       console.log('pList:', pList, ', list:',  list);

        // get route configs for all handlers
    for (var i = 0; i < list.length; i++) {
      this.__getHandlerRouteConfig($logger, list[i]);
    }

    console.log('$route:', this.$route);
  }

  __getHandlerRouteConfig ($logger, handlerName) {
    var funcStr = this[handlerName].toString();
    // TODO: test all valid JSON string
    var re = /@Hyper\.route\(([:;{}<>|"',. !@#$%^&*\?\/\[\]\-\n\r\t\b\^0-9a-zA-Z]*)\)/g;

    var reResult = re.exec(funcStr);
    console.log('funcStr:', funcStr);
    console.log('regex result:', reResult);
    if (reResult && reResult.length >= 2) {
      var config = reResult[1];

            // strip start line comments
      config = config.replace(/^[ \t]*\/\//mg, '');

      try {
        config = JSON.parse(config);
      }
      catch (err) {
        console.error('$routeInit Error:', err);
      }

      this.$route[handlerName] = config;
    }
  }

  $init () {}
  $postInit () {}
  $preRoute () {}
  $postRoute () {}
};
