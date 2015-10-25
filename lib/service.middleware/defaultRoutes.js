'use strict';
var _  = require('lodash');
var fs = require('fs');

var ServiceMiddleware = require('./service.middleware.js');

var logger = null;

class DefaultRoutes extends ServiceMiddleware {

  constructor(_logger, _httpFramework) {
    super(_logger, _httpFramework);
    logger = _logger;

    this.handles = ['otherwise', 'default'];
  }

  /**
   * Setup DefaultRoutes
   * @param service
   * @param defaultConfig
   */
  setup(defaultConfig, service, controller, route) {
    //logger.log('start DefaultRoutes setup defaultConfig:', defaultConfig);

    if(defaultConfig.hasOwnProperty('static')) {
      this._addStaticRoute(service, defaultConfig.static);
    }
    else if(defaultConfig.hasOwnProperty('redirect')) {
      if(!defaultConfig.redirect.from) {
        defaultConfig.redirect.from = '/*';
      }
      this._setupRedirectRoute(service, defaultConfig);
    }
    else if(defaultConfig.hasOwnProperty('root')) {
      logger.log("Root:", defaultConfig.root);
      this._addStaticRoute(service, defaultConfig.root, "/");
    }
    else {
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
  _addStaticRoute(service, staticContent, route) {
    if( !_.isArray(staticContent) &&
      _.isObject(staticContent) ) {
      var staticRoute = staticContent;

      if( staticRoute.hasOwnProperty('from') &&
        staticRoute.hasOwnProperty('to') ) {
        staticContent = staticRoute.from;
        route         = staticRoute.to;
      }
      else {
        if( staticRoute.hasOwnProperty('root') ) {
          service.directory.service = staticRoute.root;
        }
        if( staticRoute.hasOwnProperty('cache') ) {
          // TODO
        }
        if( staticRoute.hasOwnProperty('list') ) {
          staticContent = staticRoute.list;
        }
      }
    }

    // if staticContent is array call self with array value
    if( _.isArray(staticContent) ) {
      var ok = false;
      for(var i = 0; i < staticContent.length; i++) {
        ok = (this._addStaticRoute(service, staticContent[i], route) || ok);
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
            if(route && route.charAt(0) !== '/') {
              route = '/'+route;
            }

            if(!route) {
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
      }
      catch (err) {
        logger.warn("Add Static Route Error:", err);
        return false;
      }
    }
  }


  _setupRedirectRoute(service, route) {
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

}

module.exports = DefaultRoutes;
