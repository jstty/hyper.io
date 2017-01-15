'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _get2 = require('babel-runtime/helpers/get');

var _get3 = _interopRequireDefault(_get2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var ServiceMiddleware = require('./service.middleware.js');

var logger = null;

var DefaultRoutes = function (_ServiceMiddleware) {
  (0, _inherits3.default)(DefaultRoutes, _ServiceMiddleware);

  function DefaultRoutes() {
    (0, _classCallCheck3.default)(this, DefaultRoutes);

    var _this = (0, _possibleConstructorReturn3.default)(this, (DefaultRoutes.__proto__ || (0, _getPrototypeOf2.default)(DefaultRoutes)).call(this));

    _this.handles = ['otherwise', 'default', 'static', 'redirect'];
    return _this;
  }

  (0, _createClass3.default)(DefaultRoutes, [{
    key: 'init',
    value: function init(_logger, _httpFramework, _middleware, _serviceManager) {
      (0, _get3.default)(DefaultRoutes.prototype.__proto__ || (0, _getPrototypeOf2.default)(DefaultRoutes.prototype), 'init', this).call(this, _logger, _httpFramework, _middleware, _serviceManager);
      logger = _logger;
    }

    /**
     * Setup DefaultRoutes
     * TODO: make return a promise
     * @param service
     * @param defaultConfig
     */

  }, {
    key: 'setup',
    value: function setup(handleKey, defaultConfig, service, controller, route) {
      // logger.log('start DefaultRoutes handleKey:', handleKey);

      if (handleKey === 'static') {
        logger.group('Static Route');
        // logger.log('defaultConfig:', JSON.stringify(defaultConfig, null, 2));
        this._addStaticRoute(service, defaultConfig);
        logger.groupEnd('');
      } else if (defaultConfig.hasOwnProperty('static')) {
        logger.group('Static Route');
        // logger.log('defaultConfig static:', JSON.stringify(defaultConfig.static, null, 2));
        this._addStaticRoute(service, defaultConfig.static);
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
        logger.log('Root:', defaultConfig.root);
        this._addStaticRoute(service, defaultConfig.root, '/');
      } else {
        // all others -> DEFAULT
        defaultConfig.root = '/index.html';
        logger.log('Default:', defaultConfig.root);
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
      logger.log('Redirect Route:', redirect.from, '->', redirect.to);

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
      var staticOptions = {};
      if (!_.isArray(staticContent) && _.isObject(staticContent)) {
        var staticRoute = staticContent;

        if (staticRoute.hasOwnProperty('from')) {
          staticContent = staticRoute.from;
        }
        if (staticRoute.hasOwnProperty('to')) {
          route = staticRoute.to;
        }
        if (staticRoute.hasOwnProperty('root')) {
          service.directory.service = staticRoute.root;
        }
        if (staticRoute.hasOwnProperty('cache')) {}
        // TODO

        // this oversides "from"
        if (staticRoute.hasOwnProperty('list')) {
          staticContent = staticRoute.list;
        }

        if (staticRoute.hasOwnProperty('options') && _.isObject(staticRoute.options)) {
          staticOptions = staticRoute.options;
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
              // logger.log("Adding Static Dir Content -", staticContent);
              logger.log('Static Dir Route:', staticContent, '->', route || '/');

              this._httpFramework.addStaticDir(staticContent, route, staticOptions);
              return true;
            } else {
              // logger.log("Adding Static File -", staticContent);
              logger.log('Static File Route:', staticContent, '->', route || staticContent);

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
            logger.warn('Static File/Dir does not exist -', staticContent);
            return false;
          }
        } catch (err) {
          logger.warn('Add Static Route Error:', err);
          // logger.info("Service:", JSON.stringify(service, null, 2) );
          logger.info('route:', (0, _stringify2.default)(route, null, 2));
          logger.info('staticContent:', (0, _stringify2.default)(staticContent, null, 2));

          return false;
        }
      }
    }
  }]);
  return DefaultRoutes;
}(ServiceMiddleware);

module.exports = DefaultRoutes;