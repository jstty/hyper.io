'use strict';

var logger = null;

class ServiceMiddleware {
  constructor() {}

  init(_logger, _httpFramework, _middleware, _serviceManager) {
    logger = _logger;
    this._serviceManager = _serviceManager;
    this._middleware = _middleware;
    this._httpFramework = _httpFramework;

    // should be set
    this.handles = [];
  }

  setup(handleKey, defaultConfig, service, controller, route) {
    logger.error("This should be overridden");
  }
}

module.exports = ServiceMiddleware;