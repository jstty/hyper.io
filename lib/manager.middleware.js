'use strict';

/**
 * Manager for middleware
 *
 */
var fs         = require('fs');
var _          = require('lodash');

var util       = require('./util.js');

var logger = null;

module.exports = Middleware;

/* ---------------------------------------------------
 * Constructor
 * --------------------------------------------------- */
function Middleware (options) {
  logger = util.logger({ name: 'Middleware', env: options.env });

  this.middleware = {
  };

  this.defaultmiddleware = {
  };
}

/* ---------------------------------------------------
 * Public Functions
 * --------------------------------------------------- */
/*
 Middleware.use('ejs');
 Middleware.use('template', 'ejs');
 Middleware.use('template', './lib/middleware/ejs.js');
 Middleware.use(require('./lib/middleware/ejs.js'));

 var ejs = require('ejs');
 Middleware.use(new ejs());

 Middleware.use('template', 'handlebars', 'default'); // set default
*/

Middleware.prototype.use = function (MiddlewareGroup, MiddlewareName, option) {
  if (_.isString(option) &&
    option === 'default') {
    // check if already default
    var defaultMiddleware = this.getDefault(MiddlewareGroup);

    // if default Middleware not exist then set it
    // OR
    // not name the same
    if (!defaultMiddleware ||
        (defaultMiddleware && defaultMiddleware.name !== MiddlewareName)) {
      defaultMiddleware = this._setDefault(MiddlewareGroup, MiddlewareName);
            // default was added
      if (defaultMiddleware) {
        return defaultMiddleware.Middleware;
      }
      else {
        // problem with Middleware
        // error already reported upstream
      }
    }
  }

  var Middleware = null;
  // Middleware.use('ejs');
  if (_.isString(MiddlewareGroup) && !MiddlewareName) {
    // find Middleware file, load it
    Middleware = this._loadMiddlewareFile(null, MiddlewareName);
  }
  // Middleware.use('template', 'ejs');
  // Middleware.use('template', './lib/middleware/ejs.js');
  else if (_.isString(MiddlewareGroup) && _.isString(MiddlewareName)) {
    // find Middleware file, load it
    Middleware = this._loadMiddlewareFile(MiddlewareGroup, MiddlewareName);
  }
  // Middleware.use(require('./lib/middleware/ejs.js'));
  // var ejs = require('ejs');
  // Middleware.use(new ejs());
  else if (_.isFunction(MiddlewareGroup) || _.isObject(MiddlewareGroup)) {
    Middleware = this._setMiddleware(MiddlewareGroup);
  }
  else {
    logger.warn('Middleware (' + MiddlewareGroup + ', ' + MiddlewareName + ') invalid');
  }

  if (!Middleware) {
    logger.info('Problem loading Middleware (' + MiddlewareGroup + ', ' + MiddlewareName + ')');
  }

  return Middleware;
};

Middleware.prototype.get = function (MiddlewareGroup, MiddlewareName) {
  return this._getMiddleware(MiddlewareGroup, MiddlewareName);
};

Middleware.prototype.getAll = function (MiddlewareGroup) {
  if (this.middleware.hasOwnProperty(MiddlewareGroup)) {
    return this.middleware[MiddlewareGroup];
  }
  return null;
};

Middleware.prototype.getDefault = function (MiddlewareGroup) {
  if (this.defaultmiddleware.hasOwnProperty(MiddlewareGroup)) {
    return this.defaultmiddleware[MiddlewareGroup];
  }
  return null;
};

/* ---------------------------------------------------
 * Private Functions
 * --------------------------------------------------- */
Middleware.prototype._loadMiddlewareFile = function (MiddlewareGroup, file) {
  var MiddlewareClass = null;

  try {
    MiddlewareClass = require(file);
  }
  catch (err) {
    // this is ok
  }

  // try loading file as path
  if (!MiddlewareClass &&
        fs.existsSync(file)) {
    MiddlewareClass = require(file);
  }

  if (MiddlewareClass) {
    if (_.isFunction(MiddlewareClass)) {
      MiddlewareClass = new MiddlewareClass();
    }

    // if getInfo function does not exist auto add wrapper
    if (!MiddlewareClass.getInfo) {
      if (!MiddlewareGroup) {
        logger.warn('Could not determine Middleware Type', file);
        return null;
      }

      MiddlewareClass.getInfo = function () {
        return {
          type: MiddlewareGroup,
          name: file
        };
      };
    }

    return this._setMiddleware(MiddlewareClass);
  }

  return null;
};

Middleware.prototype._getMiddleware = function (MiddlewareGroup, MiddlewareName) {
  if (this.middleware.hasOwnProperty(MiddlewareGroup) &&
        this.middleware[MiddlewareGroup].hasOwnProperty(MiddlewareName)) {
    return this.middleware[MiddlewareGroup][MiddlewareName];
  }
  return null;
};

Middleware.prototype._setMiddleware = function (MiddlewareClass) {
  var middlewareInstance = null;
  var mInfo = {
    type: '',
    name: ''
  };
  if (_.isFunction(MiddlewareClass)) {
    middlewareInstance = new MiddlewareClass();
  }
  else if (_.isObject(MiddlewareClass)) {
    middlewareInstance = MiddlewareClass;
  }
  else {
    // should not happen
    return;
  }

  if (middlewareInstance.getInfo &&
        _.isFunction(middlewareInstance.getInfo)) {
    mInfo = middlewareInstance.getInfo();
  }

  if (!(mInfo.type &&
           mInfo.name &&
           _.isString(mInfo.name) &&
           _.isString(mInfo.type))) {
    logger.warn('Invalid Middleware Info', mInfo);
  }

  // create group/type if not exist
  if (!_.isObject(this.middleware[mInfo.type])) {
    this.middleware[mInfo.type] = {};
  }

  // check if middle ware exists
  // already exists then skip creating
  // if above is not used it will be GC'd
  if (!_.isObject(this.middleware[mInfo.type][mInfo.name])) {
    // create Middleware
    this.middleware[mInfo.type][mInfo.name] = middlewareInstance;

    // TODO: remove init in favor or $perStartInit function
    if (_.isFunction(this.middleware[mInfo.type][mInfo.name].init)) {
      try {
        this.middleware[mInfo.type][mInfo.name].init();
      }
      catch (err) {
        logger.error('Loading Middleware Error:', err);
        return null;
      }
    }
    // run $perStartInit function
    if (_.isFunction(this.middleware[mInfo.type][mInfo.name].$perStartInit)) {
      try {
        this.middleware[mInfo.type][mInfo.name].$perStartInit();
      }
      catch (err) {
        logger.error('Loading Middleware Error:', err);
        return null;
      }
    }

    // set it as default
    this._setDefault(mInfo.type, mInfo.name);

    logger.log('Loaded Middleware (' + mInfo.type + ', ' + mInfo.name + ')');
  }

  return this.middleware[mInfo.type][mInfo.name];
};

Middleware.prototype._setDefault = function (MiddlewareGroup, MiddlewareName) {
  var Middleware = this._getMiddleware(MiddlewareGroup, MiddlewareName);

  if (Middleware) {
    if (!_.isObject(this.defaultmiddleware[MiddlewareGroup])) {
      this.defaultmiddleware[MiddlewareGroup] = {
        name:       null,
        Middleware: null
      };
    }

        // set default
    this.defaultmiddleware[MiddlewareGroup].name = MiddlewareName;
    this.defaultmiddleware[MiddlewareGroup].Middleware = Middleware;

    return this.defaultmiddleware[MiddlewareGroup];
  }
  else {
    // if Middleware not exist then try to load it
    Middleware = this.Middleware(MiddlewareGroup, MiddlewareName);
    // if Middleware created, set it to default, as intended
    if (Middleware) {
      return this._setDefault(MiddlewareGroup, MiddlewareName);
    }
  }

  return null;
};

