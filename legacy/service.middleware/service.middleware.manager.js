'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _ = require('lodash');
var when = require('when');

var logger = null;

var ServiceMiddlewareManager = (function () {
  function ServiceMiddlewareManager(_logger, _httpFramework, _middleware, _serviceManager) {
    _classCallCheck(this, ServiceMiddlewareManager);

    logger = _logger;

    this._httpFramework = _httpFramework;
    this._middleware = _middleware;
    this._serviceManager = _serviceManager;

    this._list = {};
    this._allHandles = {};
  }

  _createClass(ServiceMiddlewareManager, [{
    key: 'add',
    value: function add(name) {
      try {
        var Middleware = require('./' + name + '.js');

        var middleware = new Middleware(logger, this._httpFramework, this._middleware, this._serviceManager);
        this._list[name] = middleware;

        if (middleware.handles) {
          middleware.handles.forEach((function (key) {
            if (!this._allHandles.hasOwnProperty(key)) {
              this._allHandles[key] = [];
            }

            this._allHandles[key].push(middleware);
          }).bind(this));
        }
      } catch (err) {
        throw err;
      }
    }
  }, {
    key: 'hasHandler',
    value: function hasHandler(route) {
      var hasHandler = false;

      // there is at least one handler that is in the route
      _.forEach(this._allHandles, (function (handles, key) {
        if (route.hasOwnProperty(key)) {
          hasHandler = true;
          return false; // exit early
        }
      }).bind(this));

      return hasHandler;
    }
  }, {
    key: 'setup',
    value: function setup(service, controller, route) {
      try {
        var pList = [];

        _.forEach(this._allHandles, (function (handles, key) {

          if (route.hasOwnProperty(key)) {
            _.forEach(handles, (function (middleware) {

              var p = null;
              if (middleware.setup) {
                p = middleware.setup(key, route[key], service, controller, route);
              }

              // only add promises that exist
              if (p) {
                pList.push(p);
              }
            }).bind(this));
          }
        }).bind(this));

        if (!pList.length) {
          // shortcut, instant resolve, no need for 'all'
          return when.resolve();
        } else {
          return when.all(pList);
        }
      } catch (err) {
        throw err;
      }
    }
  }]);

  return ServiceMiddlewareManager;
})();

module.exports = ServiceMiddlewareManager;