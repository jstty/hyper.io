'use strict';
var logger = null;

class ServiceMiddleware {
  constructor(_logger, _httpFramework) {
    logger = _logger;
    this._httpFramework = _httpFramework;
  }

  setup(routeData, service, controller, route) {
    logger.error("This should be overridden");
  }
}

module.exports = ServiceMiddleware;
