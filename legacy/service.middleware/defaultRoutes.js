'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _ = require('lodash');
var fs = require('fs');

var ServiceMiddleware = require('./service.middleware.js');

var logger = null;

var DefaultRoutes = (function (_ServiceMiddleware) {
  _inherits(DefaultRoutes, _ServiceMiddleware);

  function DefaultRoutes(_logger, _httpFramework) {
    _classCallCheck(this, DefaultRoutes);

    _get(Object.getPrototypeOf(DefaultRoutes.prototype), 'constructor', this).call(this, _logger, _httpFramework);
    logger = _logger;

    this.handles = ['otherwise', 'default'];
  }

  /**
   * Setup DefaultRoutes
   * @param service
   * @param defaultConfig
   */

  _createClass(DefaultRoutes, [{
    key: 'setup',
    value: function setup(defaultConfig, service, controller, route) {
      //logger.log('start DefaultRoutes setup defaultConfig:', defaultConfig);

      if (defaultConfig.hasOwnProperty('static')) {
        this._addStaticRoute(service, defaultConfig['static']);
      } else if (defaultConfig.hasOwnProperty('redirect')) {
        if (!defaultConfig.redirect.from) {
          defaultConfig.redirect.from = '/*';
        }
        this._setupRedirectRoute(service, defaultConfig);
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
          return false;
        }
      }
    }
  }, {
    key: '_setupRedirectRoute',
    value: function _setupRedirectRoute(service, route) {
      logger.log("Redirect Route:", route.redirect.from, "->", route.redirect.to);

      if (!route.redirect.hasOwnProperty('from')) {
        logger.warn(service.name, "Service Route - Redirect missing 'from'");
        return;
      }
      if (!route.redirect.hasOwnProperty('to')) {
        logger.warn(service.name, "Service Route - Redirect missing 'to'");
        return;
      }

      this._httpFramework.addRedirect(route.redirect.from, route.redirect.to);
    }
  }]);

  return DefaultRoutes;
})(ServiceMiddleware);

module.exports = DefaultRoutes;