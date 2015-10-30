'use strict';
var _    = require('lodash');
var when = require('when');

var logger = null;

class ServiceMiddlewareManager {
  constructor(_logger, _httpFramework, _middleware, _serviceManager) {
    logger = _logger;

    this._httpFramework  = _httpFramework;
    this._middleware     = _middleware;
    this._serviceManager = _serviceManager;

    this._list = {};
    this._allHandles = {};
  }

  add(name) {
    try {
      var Middleware = require('./'+name+'.js');

      var middleware = new Middleware(logger, this._httpFramework, this._middleware, this._serviceManager);
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

  hasHandler(route) {
    var hasHandler = false;

    // there is at least one handler that is in the route
    _.forEach(this._allHandles, function(handles, key) {
      if( route.hasOwnProperty(key)) {
        hasHandler = true;
        return false; // exit early
      }
    }.bind(this));

    return hasHandler;
  }

  setup(service, controller, route) {
    try {
      var pList = [];

      _.forEach(this._allHandles, function(handles, key) {

        if( route.hasOwnProperty(key)) {
          _.forEach(handles, function(middleware) {

            var p = null;
            if(middleware.setup) {
              p = middleware.setup(key, route[key], service, controller, route);
            }

            // only add promises that exist
            if(p) {
              pList.push(p);
            }
          }.bind(this));
        }

      }.bind(this));

      if(!pList.length) {
        // shortcut, instant resolve, no need for 'all'
        return when.resolve();
      } else {
        return when.all(pList);
      }

    } catch(err) {
      throw err;
    }
  }

}

module.exports = ServiceMiddlewareManager;
