'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var when = require('when');
var whenKeys = require('when/keys');
var di = require('di');
var co = require('co');

var util = require('../util.js');

var ServiceMiddleware = require('./service.middleware.js');

var logger = null;

var ApiViewRoutes = (function (_ServiceMiddleware) {
  _inherits(ApiViewRoutes, _ServiceMiddleware);

  function ApiViewRoutes(_logger, _httpFramework, _middleware, _serviceManager) {
    _classCallCheck(this, ApiViewRoutes);

    _get(Object.getPrototypeOf(ApiViewRoutes.prototype), 'constructor', this).call(this, _logger, _httpFramework, _middleware, _serviceManager);
    logger = _logger;

    this.handles = ['api', 'view'];
  }

  /**
   * Setup ApiViewRoutes
   * @param service
   * @param defaultConfig
   */

  _createClass(ApiViewRoutes, [{
    key: 'setup',
    value: function setup(handleKey, defaultConfig, service, controller, route) {
      //logger.log('start DefaultRoutes handleKey:', handleKey);

      try {
        // if return nothing then, return resolved promise
        return this._setupDynamicRoute(handleKey, service, controller, route) || when.resolve();
      } catch (err) {
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
  }, {
    key: '_setupDynamicRoute',
    value: function _setupDynamicRoute(type, service, controller, route) {
      var routeStr = route.api || route.view || "";

      if (!controller) {
        logger.error("Controller missing or invalid");
        return;
      }

      if (!routeStr) {
        logger.warn("Controller", type, "value invalid");
        return;
      }

      var pList = [];
      _.forEach(route.method, (function (value, m) {
        // TODO: move this per method
        var viewPromise = when.resolve();
        if (type == "view") {
          viewPromise = this._loadView(service, route, routeStr);
        }

        viewPromise = viewPromise.then((function (templateFunc) {

          m = m.toLowerCase(); // make sure method is lower case

          var cFunc,
              cInput,
              controllerObj = null;
          var methodFunctionName = "";

          // either function or generator function
          if (_.isFunction(route.method[m]) || util.isES6Function(route.method[m])) {
            controllerObj = route.method[m];
            methodFunctionName = route.method[m].name + " (function)";
          } else if (_.isString(route.method[m])) {
            controllerObj = controller.instance[route.method[m]];
            methodFunctionName = route.method[m];
          }

          if (_.isFunction(controllerObj) || util.isES6Function(controllerObj)) {
            cFunc = controllerObj;
          } else if (_.isObject(controllerObj)) {
            cFunc = controllerObj.run;

            if (_.isObject(controllerObj.input)) {
              cInput = controllerObj.input;
            }
          } else {
            // if function does not exist in controller
            logger.warn("Invalid Controller Function/Object", route.method[m]);
            return;
          }

          if (!cFunc || !(_.isFunction(cFunc) || util.isES6Function(cFunc))) {
            logger.warn("Controller missing method function", route.method[m]);
            return;
          }

          if (!this._httpFramework.validateMethod(m)) {
            return;
          }

          if (type == "api") {
            logger.log("API Route:", controller.name || "-", "[" + m + "]", "-", routeStr, "->", methodFunctionName);
          } else if (type == "view") {
            logger.log("View Route:", controller.name || "-", "[" + m + "]", "-", routeStr, "->", methodFunctionName);
          }

          var middlewareList = [];
          if (route.required && _.isObject(route.required)) {

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
                  options: route.required[name]
                });
              }
            }
          }

          this._httpFramework.addMethodFunction(m, middlewareList, routeStr,
          // TODO: Unify this across both express and hapi
          (function (req, res, next) {
            // ---------------------------------------
            // TODO: Custom error format, defined in config
            // General Response function
            var responded = false;
            function responseFunc(out, code, headers) {
              if (responded) {
                logger.warn("Already responded to request");
                return;
              }

              responded = true;
              var outContentType = route.outContentType;
              //logger.log("responseFunc out:", out);s

              // if view compile template
              if (type == "view" && templateFunc) {
                out = templateFunc(out);
              }

              if (_.isObject(out)) {
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
              res.end(out);
            }

            // TODO: dependency injection
            var done = function done(out, code, headers) {
              responseFunc(out, code || 200, headers);
            };
            // TODO: dependency injection
            var error = function error(out, code, headers) {
              responseFunc(out, code || 400, headers);
            };
            // TODO: dependency injection
            var fatal = function fatal(out, code, headers) {
              responseFunc(out, code || 500, headers);
            };
            // ---------------------------------------

            // ---------------------------------------
            // validate input, if inputs need validating
            if (cInput) {
              // bad inputs
              var validateErrors = this._validateInputs(cInput, req);
              if (validateErrors) {
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
            _.forEach(route.resolve, (function (func, key) {
              // TODO: dependency injection
              resolved[key] = func();
            }).bind(this));
            // promise map to save data to key
            var resolverPromise = whenKeys.map(resolved, function (value, key) {
              resolved[key] = value;
            });

            resolverPromise.then((function () {
              var module = {
                '$rawRequest': ['value', req],
                '$rawResponse': ['value', res],
                '$next': ['value', next],
                '$done': ['value', done],
                '$error': ['value', error],
                '$fatal': ['value', fatal],
                '$session': ['value', req.session],
                '$cookies': ['value', req.cookies],
                '$input': ['factory', this._httpFramework.buildInputs],
                '$service': ['value', service.instance],
                '$logger': ['value', util.logger(service.name + ' - ' + controller.name)]
              };

              // add resolved to DI
              _.forEach(resolved, (function (value, key) {
                module[key] = ['value', value];
              }).bind(this));

              // TODO: replace this with DI lib
              var generator = this._serviceManager._injectionDependency(module, service, controller, cFunc);

              var promise = null;
              // if function is generator then wait on yield
              if (util.isES6Function(cFunc)) {
                try {
                  promise = co(generator);
                } catch (ex) {
                  promise = Promise.reject(ex);
                }
              } else if (when.isPromiseLike(generator)) {
                promise = generator;
              }

              if (when.isPromiseLike(promise)) {
                promise.then(function (data) {
                  if (!responded) {
                    done(data);
                  }
                }, function (data) {
                  if (!responded) {
                    error(data);
                  }
                });
              }

              // ---------------------------------------
            }).bind(this));
          }).bind(this));
        }).bind(this));

        pList.push(viewPromise);
      }).bind(this));

      return when.all(pList);
    }

    /**
     * Validate Inputs
     * TODO: replace with lib, move to http.framework
     * @param cInput
     * @param req
     * @returns {Array}
     * @private
     */
  }, {
    key: '_validateInputs',
    value: function _validateInputs(cInput, req) {
      var errors = [];

      for (var i in cInput) {
        //logger.log("_validateInputs:" , i);

        // check input type
        if (req.hasOwnProperty(i)) {

          for (var k in cInput[i]) {
            // check required
            if (!req[i].hasOwnProperty(k) && cInput[i][k].required) {
              // missing
              errors.push({ error: "Missing " + i + " " + k, type: "missing", id: k });
            }
            // check type
            else if (req[i].hasOwnProperty(k) && cInput[i][k].type) {

                var tFuncName = "is" + util.String.capitalize(cInput[i][k].type);
                // check if lodash has type function
                if (_[tFuncName]) {
                  // check if input passes type function
                  if (!_[tFuncName](req[i][k])) {
                    errors.push({ error: "Invalid input " + k + " with value " + req[i][k] + ", expecting type " + i, type: "invalid", id: k });
                  }
                }
              }
          }
        }
      }

      if (errors.length === 0) {
        errors = undefined;
      }
      if (errors.length === 1) {
        errors = errors[0];
      }
      return errors;
    }

    /**
     * Generator/Promise Handler
     * TODO: replace this with 'co' lib
     * @param generator
     * @param result
     * @returns {*}
     * @private
     */
  }, {
    key: '_genPromiseHandle',
    value: function _genPromiseHandle(generator, result) {
      // result => { done: [Boolean], value: [Object] }
      if (result.done) return when.resolve(result.value);

      return when.resolve(result.value).then((function (res) {
        return this._genPromiseHandle(generator, generator.next(res));
      }).bind(this), (function (err) {
        return this._genPromiseHandle(generator, generator['throw'](err));
      }).bind(this));
    }

    /**
     * Load View
     * @param service
     * @param route
     * @param routeStr
     * @returns {*|Promise}
     * @private
     */
  }, {
    key: '_loadView',
    value: function _loadView(service, route, routeStr) {
      // add promise wrapper
      return when.promise((function (resolve, reject) {
        // ------------------------------------------------
        var templateMiddleware, templateDefaultMW;

        if (!route.hasOwnProperty('template')) {
          logger.warn("Template missing from route view", routeStr);
          return;
        }

        // get all 'template' middleware
        templateMiddleware = this._middleware.getAll('template');
        templateDefaultMW = this._middleware.getDefault('template');
        if (!Object.keys(templateMiddleware).length || !templateDefaultMW) {
          // load default templates
          this._middleware.add([{
            group: 'template',
            name: 'ejs',
            'package': 'hyper.io-ejs@0.0.x',
            factory: function factory(ejs) {
              return new ejs();
            }
          }]).load((function () {
            templateMiddleware = this._middleware.getAll('template');
            templateDefaultMW = this._middleware.getDefault('template');

            var tempFunc = this._getTemplateFunc(service, route, routeStr, templateMiddleware, templateDefaultMW);
            resolve(tempFunc);
          }).bind(this));
        } else {
          var tempFunc = this._getTemplateFunc(service, route, routeStr, templateMiddleware, templateDefaultMW);
          resolve(tempFunc);
        }

        // ------------------------------------------------
      }).bind(this));
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
  }, {
    key: '_getTemplateFunc',
    value: function _getTemplateFunc(service, route, routeStr, templateMiddleware, templateDefaultMW) {
      var templateData = "";

      // if not object
      if (!_.isObject(route.template)) {
        if (!_.isString(route.template)) {
          logger.warn("Template is not 'object' or 'string' type, in route view", routeStr, " - template:", route.view.template);
          return;
        }

        // convert template to object
        templateData = route.template;
        var templateType = null;

        if (templateMiddleware) {
          _.forEach(templateMiddleware, (function (template, templateName) {
            // try to detect template type, using template data
            if (template.isValidData && _.isFunction(template.isValidData) && template.isValidData(templateData)) {
              templateType = templateName;
            }
          }).bind(this));
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
            _.forEach(templateMiddleware, (function (template, templateName) {
              // try to detect template type using file extention
              if (template.isValidFileExtension && _.isFunction(template.isValidFileExtension) && template.isValidFileExtension(fileExt)) {
                route.template.type = templateName;
              }
            }).bind(this));
          }
        } else {
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
            logger.warn("Could not find Template", route.template.file, "at", templateFile);
            return;
          }
        }

        if (loadedTemplateFile) {
          templateData = fs.readFileSync(templateFile, 'utf8');
        }
      } else if (route.template.hasOwnProperty('data')) {
        templateData = route.template.data;
      }

      var templateFunc = null;
      // get template middleware
      templateMiddleware = this._middleware.get('template', route.template.type);
      if (templateMiddleware && _.isFunction(templateMiddleware.compile)) {
        // compile template
        templateFunc = templateMiddleware.compile(templateData);
      } else {
        logger.warn("Unknown template type:", route.template.type, ", in route view", routeStr);
        return templateFunc;
      }

      return templateFunc;
    }
  }]);

  return ApiViewRoutes;
})(ServiceMiddleware);

module.exports = ApiViewRoutes;