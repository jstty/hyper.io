'use strict';

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = null;

var ServiceMiddleware = function () {
  function ServiceMiddleware() {
    (0, _classCallCheck3.default)(this, ServiceMiddleware);
  }

  (0, _createClass3.default)(ServiceMiddleware, [{
    key: 'init',
    value: function init(_logger, _httpFramework, _middleware, _serviceManager) {
      logger = _logger;
      this._serviceManager = _serviceManager;
      this._middleware = _middleware;
      this._httpFramework = _httpFramework;

      // should be set
      this.handles = [];
    }
  }, {
    key: 'setup',
    value: function setup(handleKey, defaultConfig, service, controller, route) {
      logger.error('This should be overridden');
    }
  }]);
  return ServiceMiddleware;
}();

module.exports = ServiceMiddleware;