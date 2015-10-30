'use strict';
var _    = require('lodash');
var fs   = require('fs');
var path = require('path');

var ServiceMiddleware = require('./service.middleware.js');

var logger = null;

class DefaultRoutes extends ServiceMiddleware {

  constructor(_logger, _httpFramework, _middleware, _serviceManager) {
    super(_logger, _httpFramework, _middleware, _serviceManager);
    logger = _logger;

    this.handles = ['otherwise', 'default', 'static', 'redirect'];
  }

  /**
   * Setup DefaultRoutes
   * TODO: make return a promise
   * @param service
   * @param defaultConfig
   */
  setup(handleKey, defaultConfig, service, controller, route) {
    //logger.log('start DefaultRoutes handleKey:', handleKey);

    if( handleKey === 'static' ) {
      logger.group("Static Route");
      //logger.log('defaultConfig:', JSON.stringify(defaultConfig, null, 2));
      this._addStaticRoute(service, defaultConfig);
      logger.groupEnd('');
    }
    else if( defaultConfig.hasOwnProperty('static') ) {
      logger.group("Static Route");
      //logger.log('defaultConfig static:', JSON.stringify(defaultConfig.static, null, 2));
      this._addStaticRoute(service, defaultConfig.static);
      logger.groupEnd('');
    }
    else if( handleKey === 'redirect' ) {
      if(!defaultConfig.from) {
          defaultConfig.from = '/*';
      }
      this._setupRedirectRoute(service, defaultConfig);
    }
    else if( defaultConfig.hasOwnProperty('redirect')) {
      if(!defaultConfig.redirect.from) {
          defaultConfig.redirect.from = '/*';
      }
      this._setupRedirectRoute(service, defaultConfig.redirect);
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
   * Setup Redirect Route
   * @param service
   * @param route
   * @private
   */
  _setupRedirectRoute(service, redirect) {
    logger.log("Redirect Route:", redirect.from, "->" , redirect.to);

    if(!redirect.hasOwnProperty('from')) {
      logger.warn(service.name, "Service Route - Redirect missing 'from'");
      return;
    }
    if(!redirect.hasOwnProperty('to')) {
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
        //logger.info("Service:", JSON.stringify(service, null, 2) );
        logger.info("route:", JSON.stringify(route, null, 2) );
        logger.info("staticContent:", JSON.stringify(staticContent, null, 2) );

        return false;
      }
    }
  }

}

module.exports = DefaultRoutes;
