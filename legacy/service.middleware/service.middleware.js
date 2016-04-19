'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var logger = null;

var ServiceMiddleware = (function () {
  function ServiceMiddleware() {
    _classCallCheck(this, ServiceMiddleware);
  }

  _createClass(ServiceMiddleware, [{
    key: "init",
    value: function init(_logger, _httpFramework, _middleware, _serviceManager) {
      logger = _logger;
      this._serviceManager = _serviceManager;
      this._middleware = _middleware;
      this._httpFramework = _httpFramework;

      // should be set
      this.handles = [];
    }
  }, {
    key: "setup",
    value: function setup(handleKey, defaultConfig, service, controller, route) {
      logger.error("This should be overridden");
    }
  }]);

  return ServiceMiddleware;
})();

module.exports = ServiceMiddleware;