'use strict';
var logger = null;

class ServiceMiddleware {
  constructor(_logger, _httpFramework, _middleware, _serviceManager) {
    logger = _logger;
    this._serviceManager = _serviceManager;
    this._middleware     = _middleware;
    this._httpFramework  = _httpFramework;
  }

  setup(routeData, service, controller, route) {
    logger.error("This should be overridden");
  }
}

module.exports = ServiceMiddleware;
