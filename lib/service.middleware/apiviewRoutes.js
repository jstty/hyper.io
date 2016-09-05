'use strict';
var _          = require('lodash');
var fs         = require('fs');
var path       = require('path');
var when       = require('when');
var whenKeys   = require('when/keys');
var whenPipeline = require('when/pipeline');
var co         = require('co');

var util       = require('../util.js');

var ServiceMiddleware = require('./service.middleware.js');

var logger = null;

class ApiViewRoutes extends ServiceMiddleware {

  constructor () {
    super();
    this.handles = ['api', 'view'];
  }

  init (_logger, _httpFramework, _middleware, _serviceManager) {
    super.init(_logger, _httpFramework, _middleware, _serviceManager);
    logger = _logger;
  }

  /**
   * Setup ApiViewRoutes
   * @param service
   * @param defaultConfig
   */
  setup (handleKey, defaultConfig, service, controller, route) {
    // logger.log('start DefaultRoutes handleKey:', handleKey);

    try {
      // if return nothing then, return resolved promise
      return this._setupDynamicRoute(handleKey, service, controller, route) || when.resolve();
    }
    catch (err) {
      logger.error('ApiViewRoutes Setup Error:', err);
    }
  }

  /*
   * TODO: make this pipeline general
   * API:
   *      [required (middleware)] -> [input validator] -> [pre (middleware)] -> [resolve] -> controller method -> [post (middleware)] -> OUT (json)
   *
   * View:
   *      [required (middleware)] -> [input validator] -> [pre (middleware)] -> [resolve] -> controller method -> [post (middleware)] -> template (middleware) -> OUT (html)
   */
  /**
   * Setup Dynamic Route (view/api)
   * @param type
   * @param service
   * @param controller
   * @param route
   * @returns {*|Promise}
   * @private
   */
  _setupDynamicRoute (type, service, controller, route) {
    var routeStr = route.api || route.view || '';

    if (!controller) {
      logger.error('Controller missing or invalid');
      return;
    }

    if (!routeStr) {
      logger.warn('Controller', type, 'value invalid');
      return;
    }

    var pList = [];
    _.forEach(route.method, function (value, m) {
      // TODO: move this per method
      var viewPromise = when.resolve();
      if (type === 'view') {
        viewPromise = this._loadView(service, route, routeStr);
      }

      viewPromise = viewPromise.then(function (templateFunc) {
        m = m.toLowerCase(); // make sure method is lower case

        var cFunc = null;
        var cInput = null;
        var controllerObj = null;
        var methodFunctionName = '';

        // either function or generator function
        if (_.isFunction(route.method[m]) || util.isES6Function(route.method[m])) {
          controllerObj = route.method[m];
          methodFunctionName = route.method[m].name + ' (function)';
        }
        else if (_.isString(route.method[m])) {
          controllerObj = controller.instance[ route.method[m] ];
          methodFunctionName = route.method[m];
        }

        if (_.isFunction(controllerObj) || util.isES6Function(controllerObj)) {
          cFunc = controllerObj;
        }
        else if (_.isObject(controllerObj)) {
          cFunc = controllerObj.run;

          if (_.isObject(controllerObj.input)) {
            cInput = controllerObj.input;
          }
        }
        else {
          // if function does not exist in controller
          logger.warn('Invalid Controller Function/Object', route.method[m]);
          return;
        }

        if (!cFunc || !(_.isFunction(cFunc) || util.isES6Function(cFunc))) {
          logger.warn('Controller missing method function', route.method[m]);
          return;
        }

        if (!this._httpFramework.validateMethod(m)) {
          return;
        }

        if (type === 'api') {
          logger.log('API Route:',
            controller.name || '-',
            '[' + m + ']',
            '-', routeStr, '->', methodFunctionName);
        }
        else if (type === 'view') {
          logger.log('View Route:',
            controller.name || '-',
            '[' + m + ']',
            '-', routeStr, '->', methodFunctionName);
        }

        var middlewareList = [];
        if (route.required &&
          _.isObject(route.required)) {
          // load all middleware if they exist
          for (var name in route.required) {
            var middleware = this._middleware.get('route', name);

            // if get failed then
            // auto load middleware
            if (!middleware) {
              middleware = this._middleware.use('route', name);
            }
            if (!middleware) {
              middleware = this._middleware.use('route', 'hyper.io-' + name);
            }
            if (!middleware) {
              middleware = this._middleware.use('route', 'hyper.io-' + this._httpFramework.getName() + '-' + name);
            }

            if (middleware) {
              middlewareList.push({
                middleware: middleware,
                options:    route.required[name]
              });
            }
          }
        }

        var routeHandlers = {
          preRoute:  null,
          route:     cFunc,
          postRoute: null
        };

        if (_.isFunction(controller.instance['$preRoute'])) {
          routeHandlers.preRoute = controller.instance['$preRoute']; // .bind(controller.instance);
        }

        if (_.isFunction(controller.instance['$postRoute'])) {
          routeHandlers.postRoute = controller.instance['$postRoute']; // .bind(controller.instance);
        }

        this._httpFramework.addWrappedMethodFunction(
            m, middlewareList, routeStr,
            this._handlerPipeline.bind(this,
                routeHandlers, type, service, controller, route, cInput, templateFunc)
        );
      }.bind(this));

      pList.push(viewPromise);
    }.bind(this));

    return when.all(pList);
  }

  // TODO: to many input, need some work
  _handlerPipeline (routeHandlers, type, service, controller, route, cInput, templateFunc,
                   // passed in from http framework
                   input, session, cookies, rawRequest, rawResponse, next
  ) {
    var plist = [];

    var getHandler = function (handlerFunc, resolved, skipOnError) {
      return this._handlerWrapper.bind(this, handlerFunc, resolved, skipOnError, service, controller);
    };

    // ---------------------------------------
    // TODO: fix this
    // validate input, if inputs need validating
    // if( cInput ) {
    //  // bad inputs
    //  var validateErrors = this._httpFramework.validateInputs(cInput, rawRequest);
    //  if(validateErrors) {
    //    error(validateErrors);
    //  }
    // }
    // ---------------------------------------

    // ---------------------------------------
    // Run resolvers
    // ---------------------------------------
    var resolved = {};
    // run the resolveFuncs
    _.forEach(route.resolve, function (func, key) {
      // TODO: dependency injection
      resolved[key] = func();
    });
    // promise map to save data to key
    var resolverPromise = whenKeys.map(resolved, function (value, key) {
      resolved[key] = value;
    });

    return resolverPromise.then(function () {
      resolved['$service'] = service.instance;
      resolved['$rawRequest'] = rawRequest;
      resolved['$rawResponse'] = rawResponse;
      resolved['next'] = next;
      resolved['$session'] = session;
      resolved['$cookies'] = cookies;
      resolved['$input'] = input;
      resolved['$logger'] = util.logger(service.name + ' - ' + controller.name);

      // pre
      if (routeHandlers.preRoute) {
        plist.push(getHandler.call(this, routeHandlers.preRoute, resolved, false));
      }

      // route
      if (routeHandlers.route) {
        plist.push(getHandler.call(this, routeHandlers.route, resolved, true));
      }

      // post
      if (routeHandlers.postRoute) {
        plist.push(getHandler.call(this, routeHandlers.postRoute, resolved, false));
      }

      return whenPipeline(plist, {})
          .then(function (output) {
            // if view compile template
            if (type === 'view' && templateFunc) {
              output.data = templateFunc(output.data);
            }

            if (output.headers &&
                !output.headers.hasOwnProperty('Content-type') &&
                route.outContentType) {
              output.headers['Content-Type'] = route.outContentType;
            }

            return output;
          });
    }.bind(this));
  }

  // TODO: to many input, need some work
  _handlerWrapper (handlerFunc, resolved, skipOnError, service, controller, orgOutput) {
    if (!orgOutput) {
      orgOutput = { out: null, code: 200, headers: null };
    }

    // error, 40x and 50x codes
    if (orgOutput.code &&
        orgOutput.code > 400 &&
        skipOnError) {
      return when.resolve(orgOutput);
    }

    var deferer = when.defer();
    var resolveOutput = function (newOutput) {
      // needed to add this customer to work around the issue of lodash converting buffers to arrays
      // https://github.com/lodash/lodash/issues/1453
      var out = _.merge(orgOutput, newOutput, function (a, b) {
        if (b instanceof Buffer) {
          return b;
        }
      });
      deferer.resolve(out);
    };

    // TODO: dependency injection
    var done = function (data, code, headers) {
      resolveOutput({
        data:    data,
        code:    code || orgOutput.code || 200,
        headers: headers
      });
    };
    // TODO: dependency injection
    var error = function (data, code, headers) {
      resolveOutput({
        data:    data,
        code:    code || 400,
        headers: headers
      });
    };
    // TODO: dependency injection
    var fatal = function (data, code, headers) {
      resolveOutput({
        data:    data,
        code:    code || 500,
        headers: headers
      });
    };

    // TODO: dependency injection
    var custom = function (data) {
      if (_.isObject(data)) {
        if (data.hasOwnProperty('filename')) {
          if (!data.header) {
            data.headers = {};
          }
          data.headers.filename = data.filename;
          delete data.filename;
        }

        resolveOutput(data);
      }
      else {
        logger.error('custom response input must be object');
      }
    };
    // ---------------------------------------

    var module = {
      '$done':   ['value', done],
      '$error':  ['value', error],
      '$fatal':  ['value', fatal],
      '$custom': ['value', custom],
      '$output': ['value', orgOutput || {}]
    };

    // add resolved to DI
    _.forEach(resolved, function (value, key) {
      module[key] = ['value', value];
    });

    // TODO: replace this with DI lib
    try {
      var result = this._serviceManager.injectionDependency(module, service, controller.instance, handlerFunc);
    }
    catch (err) {
      // TODO: fix this so errors are thrown, they seem to be swallowed by DI
      error({ error: err.message });
    }

    // if function is generator then wait on yield
    if (util.isES6Function(handlerFunc)) {
      try {
        // result is generator, so co wrapper it and turn into promise
        result = co(result);
      }
      catch (err) {
        error({ error: err.message });
      }
    }

    // if result is promise, fire done on the result data
    if (when.isPromiseLike(result)) {
      result
          .then(function (output) {
            // TODO: figure out better way to handle combined input/vs just data
            // API breaking change?
            if (output.data && output.code) {
              done(output.data, output.code, output.headers);
            }
            else {
              done(output);
            }
          }, function (err) {
            error({ error: err });
          });
    }
    // if result is not promise and not null or undefined
    else if (result !== null && result !== undefined) {
      // TODO: figure out better way to handle combined input/vs just data
      // API breaking change?
      var output = result;
      if (output.data && output.code) {
        done(output.data, output.code, output.headers);
      }
      else {
        done(output);
      }
    }

    return deferer.promise;
  }

  /**
   * Load View
   * @param service
   * @param route
   * @param routeStr
   * @returns {*|Promise}
   * @private
   */
  _loadView (service, route, routeStr) {
    // add promise wrapper
    return when.promise(function (resolve, reject) {
    // ------------------------------------------------
      var templateMiddleware, templateDefaultMW;

      if (!route.hasOwnProperty('template')) {
        logger.warn('Template missing from route view', routeStr);
        return;
      }

      // get all 'template' middleware
      templateMiddleware = this._middleware.getAll('template');
      templateDefaultMW = this._middleware.getDefault('template');
      if (!Object.keys(templateMiddleware).length || !templateDefaultMW) {
        // load default templates
        this._middleware.install([{
          group:   'template',
          name:    'ejs',
          package: 'hyper.io-ejs@0.0.x',
          factory: function (Ejs) {
            return new Ejs();
          }
        }])
          .then(function () {
            templateMiddleware = this._middleware.getAll('template');
            templateDefaultMW = this._middleware.getDefault('template');

            var tempFunc = this._getTemplateFunc(service, route, routeStr, templateMiddleware, templateDefaultMW);
            resolve(tempFunc);
          }.bind(this));
      }
      else {
        var tempFunc = this._getTemplateFunc(service, route, routeStr, templateMiddleware, templateDefaultMW);
        resolve(tempFunc);
      }

    // ------------------------------------------------
    }.bind(this));
    // end promise wrapper
  }

  /**
   * Get Template Function (used for 'view')
   * @param service
   * @param route
   * @param routeStr
   * @param templateMiddleware
   * @param templateDefaultMW
   * @returns {*}
   * @private
   */
  _getTemplateFunc (service, route, routeStr, templateMiddleware, templateDefaultMW) {
    var templateData = '';

    // if not object
    if (!_.isObject(route.template)) {
      if (!_.isString(route.template)) {
        logger.warn("Template is not 'object' or 'string' type, in route view", routeStr, ' - template:', route.view.template);
        return;
      }

      // convert template to object
      templateData = route.template;
      var templateType = null;

      if (templateMiddleware) {
        _.forEach(templateMiddleware, function (template, templateName) {
          // try to detect template type, using template data
          if (template.isValidData &&
            _.isFunction(template.isValidData) &&
            template.isValidData(templateData)) {
            templateType = templateName;
          }
        });
      }

      if (!templateType) {
        // TODO: should this be a feature to try and load as file?
      }

      route.template = {
        type: templateType,
        data: templateData
      };
    }

    // no template type
    if (!route.template.hasOwnProperty('type')) {
      var fileExt = '';
      // try to detect type based on file extension
      if (route.template.hasOwnProperty('file')) {
        fileExt = util.getFileExtension(route.template.file);
      }

      if (fileExt.length) {
        if (templateMiddleware) {
          _.forEach(templateMiddleware, function (template, templateName) {
            // try to detect template type using file extention
            if (template.isValidFileExtension &&
              _.isFunction(template.isValidFileExtension) &&
              template.isValidFileExtension(fileExt)) {
              route.template.type = templateName;
            }
          });
        }
      }
      else {
        // all else fails, assume it's ejs
        route.template.type = templateDefaultMW.getInfo().name;
      }
    }

    if (route.template.hasOwnProperty('file')) {
      var templateFile = route.template.file;
      var loadedTemplateFile = true;

      if (!fs.existsSync(templateFile)) {
        // default "<service.directory>/views/<template>"
        templateFile = path.normalize(service.directory.views + path.sep + route.template.file);
        if (!fs.existsSync(templateFile)) {
          logger.warn('Could not find Template', route.template.file, 'at', templateFile);
          return;
        }
      }

      if (loadedTemplateFile) {
        templateData = fs.readFileSync(templateFile, 'utf8');
      }
    }
    else if (route.template.hasOwnProperty('data')) {
      templateData = route.template.data;
    }

    var templateFunc = null;
    // get template middleware
    templateMiddleware = this._middleware.get('template', route.template.type);
    if (templateMiddleware &&
      _.isFunction(templateMiddleware.compile)) {
      // compile template
      templateFunc = templateMiddleware.compile(templateData);
    }
    else {
      logger.warn('Unknown template type:', route.template.type, ', in route view', routeStr);
      return templateFunc;
    }

    return templateFunc;
  }

}

module.exports = ApiViewRoutes;
