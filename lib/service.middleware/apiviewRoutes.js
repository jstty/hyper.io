'use strict';
var _          = require('lodash');
var fs         = require('fs');
var path       = require('path');
var when       = require('when');
var whenKeys   = require('when/keys');
var di         = require('di');
var co         = require('co');
var mime       = require('mime');

var util       = require('../util.js');

var ServiceMiddleware = require('./service.middleware.js');

var logger = null;

class ApiViewRoutes extends ServiceMiddleware {

  constructor() {
    super();
    this.handles = ['api', 'view'];
  }

  init(_logger, _httpFramework, _middleware, _serviceManager) {
    super.init(_logger, _httpFramework, _middleware, _serviceManager);
    logger = _logger;
  }

  /**
   * Setup ApiViewRoutes
   * @param service
   * @param defaultConfig
   */
  setup(handleKey, defaultConfig, service, controller, route) {
    //logger.log('start DefaultRoutes handleKey:', handleKey);

    try {
      // if return nothing then, return resolved promise
      return this._setupDynamicRoute(handleKey, service, controller, route) || when.resolve();
    } catch(err) {
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
  _setupDynamicRoute(type, service, controller, route) {
    var routeStr = route.api || route.view || "";

    if(!controller) {
      logger.error("Controller missing or invalid");
      return;
    }

    if(!routeStr) {
      logger.warn("Controller", type, "value invalid");
      return;
    }

    var pList = [];
    _.forEach(route.method, function(value, m) {
      // TODO: move this per method
      var viewPromise = when.resolve();
      if( type == "view" ){
        viewPromise = this._loadView(service, route, routeStr);
      }

      viewPromise = viewPromise.then(function(templateFunc){

        m = m.toLowerCase(); // make sure method is lower case

        var cFunc, cInput, controllerObj = null;
        var methodFunctionName = "";

        // either function or generator function
        if( _.isFunction(route.method[m]) || util.isES6Function(route.method[m]) ) {
          controllerObj = route.method[m];
          methodFunctionName = route.method[m].name + " (function)";
        }
        else if(_.isString(route.method[m])) {
          controllerObj = controller.instance[ route.method[m] ];
          methodFunctionName = route.method[m];
        }

        if(_.isFunction(controllerObj) || util.isES6Function(controllerObj)) {
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

        if( !cFunc || !(_.isFunction(cFunc) || util.isES6Function(cFunc) ) ) {
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
              if(!headers || !_.isObject(headers)) {
                headers = {};
              }

              if(!headers.hasOwnProperty('Content-type') &&
                  route.outContentType) {
                headers['Content-Type'] = route.outContentType;
              }
              //logger.log("responseFunc out:", out);

              // if view compile template
              if( type == "view" &&
                  templateFunc) {
                out = templateFunc(out);
              }

              if(headers.filename) {
                var mimetype = mime.lookup(headers.filename);
                if(!headers.hasOwnProperty('Content-type')) {
                  headers['Content-type'] = mimetype;
                }
                if(!headers.hasOwnProperty('Content-disposition')) {
                  headers['Content-disposition'] = 'attachment; filename=' + headers.filename;
                }
              }

              // is not buffer and is object
              if(!Buffer.isBuffer(out) &&
                  _.isObject(out) ) {

                // assume JSON
                if(!headers.hasOwnProperty('Content-type')) {
                  headers['Content-Type'] = "application/json";
                }
                // convert object to string
                out = JSON.stringify(out);
              }
              else if(_.isString(out)) {
                // assume HTML
                if(!headers.hasOwnProperty('Content-type')) {
                  headers['Content-Type'] = "text/html";
                }
              }
              else {
                // ???
              }

              // merge default content-type with headers
              res.writeHead(code, headers);

              if(Buffer.isBuffer(out)) {
                res.end( out, 'binary');
              } else {
                res.end( out );
              }
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
            // TODO: dependency injection
            var custom = function(data) {
              if(_.isObject(data)) {
                if(data.hasOwnProperty('filename')) {
                  if(!data.header) {
                    data.headers = {};
                  }
                  data.headers.filename = data.filename;
                  delete data.filename;
                }

                responseFunc(data.data, data.code || 200, data.headers);
              } else {
                logger.error('custom response input must be object');
              }
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
                '$custom':      ['value',   custom],
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

              // TODO: replace this with DI lib
              var generator = this._serviceManager._injectionDependency(module, service, controller, cFunc);

              var promise = null;
              // if function is generator then wait on yield
              if( util.isES6Function(cFunc) ) {
                try {
                  promise = co(generator);
                } catch (ex) {
                  promise = Promise.reject(ex);
                }
              }
              else if(when.isPromiseLike(generator)) {
                promise = generator;
              }

              if(when.isPromiseLike(promise)) {
                promise
                  .then(function(data){
                    if(!responded) { done(data); }
                  }, function(data){
                    if(!responded) { error(data); }
                  })
              }

              // ---------------------------------------
            }.bind(this));

          }.bind(this));
      }.bind(this));

      pList.push(viewPromise);
    }.bind(this));

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
  _validateInputs(cInput, req) {
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
  }

  /**
   * Generator/Promise Handler
   * TODO: replace this with 'co' lib
   * @param generator
   * @param result
   * @returns {*}
   * @private
   */
  _genPromiseHandle(generator, result) {
    // result => { done: [Boolean], value: [Object] }
    if (result.done) return when.resolve(result.value);

    return when.resolve(result.value).then(function (res){
      return this._genPromiseHandle(generator, generator.next(res));
    }.bind(this), function (err){
      return this._genPromiseHandle(generator, generator.throw(err));
    }.bind(this));
  }


  /**
   * Load View
   * @param service
   * @param route
   * @param routeStr
   * @returns {*|Promise}
   * @private
   */
  _loadView(service, route, routeStr) {
    // add promise wrapper
    return when.promise(function(resolve, reject) {
    // ------------------------------------------------
      var templateMiddleware, templateDefaultMW;

      if( !route.hasOwnProperty('template')) {
        logger.warn("Template missing from route view", routeStr);
        return;
      }

      // get all 'template' middleware
      templateMiddleware = this._middleware.getAll('template');
      templateDefaultMW  = this._middleware.getDefault('template');
      if(!Object.keys(templateMiddleware).length || !templateDefaultMW) {
        // load default templates
        this._middleware.add([{
          group: 'template',
          name: 'ejs',
          package: 'hyper.io-ejs@0.0.x',
          factory: function(ejs){ return new ejs(); }
        }])
          .load(function(){
            templateMiddleware = this._middleware.getAll('template');
            templateDefaultMW  = this._middleware.getDefault('template');

            var tempFunc = this._getTemplateFunc(service, route, routeStr, templateMiddleware, templateDefaultMW);
            resolve(tempFunc);
          }.bind(this));
      } else {
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
  _getTemplateFunc(service, route, routeStr, templateMiddleware, templateDefaultMW) {
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
        _.forEach(templateMiddleware, function (template, templateName) {
          // try to detect template type, using template data
          if (template.isValidData &&
            _.isFunction(template.isValidData) &&
            template.isValidData(templateData)) {
            templateType = templateName;
          }
        }.bind(this));
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
          }.bind(this));
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
    } else {
      logger.warn("Unknown template type:", route.template.type, ", in route view", routeStr);
      return templateFunc;
    }

    return templateFunc;
  }

}

module.exports = ApiViewRoutes;
