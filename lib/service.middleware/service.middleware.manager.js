'use strict';
var _ = require('lodash');

var logger = null;

class ServiceMiddlewareManager {
  constructor(_logger, _httpFramework) {
    logger = _logger;

    this._httpFramework = _httpFramework;

    this._list = {};
    this._allHandles = {};
  }

  add(name) {
    try {
      var Middleware = require('./'+name+'.js');

      var middleware = new Middleware(logger, this._httpFramework);
      this._list[name] = middleware;

      if(middleware.handles) {
        middleware.handles.forEach(function(key) {
          if(!this._allHandles.hasOwnProperty(key)) {
            this._allHandles[key] = [];
          }

          this._allHandles[key].push(middleware);
        }.bind(this));
      }
    } catch(err) {
      throw err;
    }
  }

  setup(service, controller, route) {
    try {
      _.forEach(this._allHandles, function(handles, key) {

        if( route.hasOwnProperty(key)) {

          _.forEach(handles, function(middleware) {

            if(middleware.setup) {
              middleware.setup(route[key], service, controller, route);
            }

          }.bind(this));

        }
      }.bind(this));
    } catch(err) {
      throw err;
    }
  }

}

module.exports = ServiceMiddlewareManager;
