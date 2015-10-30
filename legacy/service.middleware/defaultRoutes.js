'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var ServiceMiddleware = require('./service.middleware.js');

var logger = null;

var DefaultRoutes = (function (_ServiceMiddleware) {
  _inherits(DefaultRoutes, _ServiceMiddleware);

  function DefaultRoutes(_logger, _httpFramework, _middleware, _serviceManager) {
    _classCallCheck(this, DefaultRoutes);

    _get(Object.getPrototypeOf(DefaultRoutes.prototype), 'constructor', this).call(this, _logger, _httpFramework, _middleware, _serviceManager);
    logger = _logger;

    this.handles = ['otherwise', 'default', 'static', 'redirect'];
  }

  /**
   * Setup DefaultRoutes
   * TODO: make return a promise
   * @param service
   * @param defaultConfig
   */

  _createClass(DefaultRoutes, [{
    key: 'setup',
    value: function setup(handleKey, defaultConfig, service, controller, route) {
      //logger.log('start DefaultRoutes handleKey:', handleKey);

      if (handleKey === 'static') {
        logger.group("Static Route");
        //logger.log('defaultConfig:', JSON.stringify(defaultConfig, null, 2));
        this._addStaticRoute(service, defaultConfig);
        logger.groupEnd('');
      } else if (defaultConfig.hasOwnProperty('static')) {
        logger.group("Static Route");
        //logger.log('defaultConfig static:', JSON.stringify(defaultConfig.static, null, 2));
        this._addStaticRoute(service, defaultConfig['static']);
        logger.groupEnd('');
      } else if (handleKey === 'redirect') {
        if (!defaultConfig.from) {
          defaultConfig.from = '/*';
        }
        this._setupRedirectRoute(service, defaultConfig);
      } else if (defaultConfig.hasOwnProperty('redirect')) {
        if (!defaultConfig.redirect.from) {
          defaultConfig.redirect.from = '/*';
        }
        this._setupRedirectRoute(service, defaultConfig.redirect);
      } else if (defaultConfig.hasOwnProperty('root')) {
        logger.log("Root:", defaultConfig.root);
        this._addStaticRoute(service, defaultConfig.root, "/");
      } else {
        // all others -> DEFAULT
        defaultConfig.root = '/index.html';
        logger.log("Default:", defaultConfig.root);
        this._httpFramework.addStaticFileDefault(defaultConfig.root);
      }
    }

    /**
     * Setup Redirect Route
     * @param service
     * @param route
     * @private
     */
  }, {
    key: '_setupRedirectRoute',
    value: function _setupRedirectRoute(service, redirect) {
      logger.log("Redirect Route:", redirect.from, "->", redirect.to);

      if (!redirect.hasOwnProperty('from')) {
        logger.warn(service.name, "Service Route - Redirect missing 'from'");
        return;
      }
      if (!redirect.hasOwnProperty('to')) {
        logger.warn(service.name, "Service Route - Redirect missing 'to'");
        return;
      }

      this._httpFramework.addRedirect(redirect.from, redirect.to);
    }

    /**
     * Add Static Routes
     * @param service
     * @param staticContent
     * @param route
     * @returns {boolean}
     * @private
     */
  }, {
    key: '_addStaticRoute',
    value: function _addStaticRoute(service, staticContent, route) {
      if (!_.isArray(staticContent) && _.isObject(staticContent)) {
        var staticRoute = staticContent;

        if (staticRoute.hasOwnProperty('from') && staticRoute.hasOwnProperty('to')) {
          staticContent = staticRoute.from;
          route = staticRoute.to;
        } else {
          if (staticRoute.hasOwnProperty('root')) {
            service.directory.service = staticRoute.root;
          }
          if (staticRoute.hasOwnProperty('cache')) {
            // TODO
          }
          if (staticRoute.hasOwnProperty('list')) {
            staticContent = staticRoute.list;
          }
        }
      }

      // if staticContent is array call self with array value
      if (_.isArray(staticContent)) {
        var ok = false;
        for (var i = 0; i < staticContent.length; i++) {
          ok = this._addStaticRoute(service, staticContent[i], route) || ok;
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
              if (route && route.charAt(0) !== '/') {
                route = '/' + route;
              }

              if (!route) {
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
        } catch (err) {
          logger.warn("Add Static Route Error:", err);
          //logger.info("Service:", JSON.stringify(service, null, 2) );
          logger.info("route:", JSON.stringify(route, null, 2));
          logger.info("staticContent:", JSON.stringify(staticContent, null, 2));

          return false;
        }
      }
    }
  }]);

  return DefaultRoutes;
})(ServiceMiddleware);

module.exports = DefaultRoutes;