'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var path = require('path');
var _ = require('lodash');
var when = require('when');
var express = require('express');
var compress = require('compression'); // aka. express.compress
var cookieParser = require('cookie-parser'); // aka. express.cookieParser
var errorHandler = require('errorhandler'); // aka. express.errorHandler
var bodyParser = require('body-parser'); // aka. express.bodyParser
var methodOverride = require('method-override'); // aka. express.methodOverride
var morgan = require('morgan'); // aka. express.logger
var session = require('express-session'); // aka. express.session
var mime = require('mime');

//
var Util = require('./util.js');
var logger = null;

module.exports = HttpFramework_Express;

// TODO: add https support
function HttpFramework_Express(options, $stats) {
    this._options = _.merge({
        env: 'dev',
        port: 8000,
        compress: true,
        urlencoded: true,
        parser: {
            cookies: true,
            json: true
        },
        session: false
    }, options);

    if (process.env.PORT) {
        this._options.port = process.env.PORT;
    }

    this._stats = $stats;

    logger = Util.logger('Express');

    this._app = express();
    this._server = null;
}

// set/get server port
HttpFramework_Express.prototype.protocol = function () {
    return 'http' + (this._options.credentials ? 's' : '') + ':';
};

// set/get server port
HttpFramework_Express.prototype.port = function (nPort) {
    if (nPort) {
        this._options.port = nPort;
    }

    return this._options.port;
};

// load all services
HttpFramework_Express.prototype.load = function () {
    logger.group('Express HttpFramework Loading...');

    // add promise wrapper
    return when.promise(function (resolve, reject) {
        // ------------------------------------------------

        try {
            this._app.set('port', this._options.port);
            logger.info('Using Port', this._app.get('port'));

            if (!this._options.silent) {
                this._app.use(this._getExpressLogger());
            }

            this._app.use(methodOverride());

            if (this._options.env === 'dev') {
                logger.info('Enabling Error Logging');
                this._app.use(errorHandler({ showStack: true, dumpExceptions: true }));
            }
            if (this._options.compress) {
                logger.info('Enabling Compression');
                this._app.use(compress());
            }
            if (this._options.urlencoded) {
                logger.info('Enabling URL Encoding');
                this._app.use(bodyParser.urlencoded({ extended: true }));
            }
            if (this._options.parser.cookies) {
                logger.info('Enabling Cookie Parser');
                this._app.use(cookieParser());
            }
            if (this._options.parser.json) {
                logger.info('Enabling JSON support');
                this._app.use(bodyParser.json());
            }

            if (this._options.session) {
                logger.info('Enabling Sessions');

                var defaultSession = {
                    secret: Util.string.random(32),
                    resave: false, // depends on the session store, see https://github.com/expressjs/session#resave
                    saveUninitialized: false, // depends on several cases, see https://github.com/expressjs/session#saveuninitialized
                    cookie: {
                        // TODO: auto enable "secure: true" only if https
                        path: '/',
                        httpOnly: true,
                        maxAge: 1000 * 60 * 24 // 24 hours
                    },
                    storeInst: new session.MemoryStore()
                };

                // if this._options.session no object then make default settings
                if (!_.isObject(this._options.session)) {
                    this._options.session = defaultSession;
                } else {
                    this._options.session = _.merge(defaultSession, this._options.session);
                }

                this._app.use(session(this._options.session));
            }

            resolve();
            logger.groupEnd('');
        } catch (err) {
            reject(err);
            logger.groupEnd('');
        }

        // ------------------------------------------------
    }.bind(this));
    // end promise wrapper
};

HttpFramework_Express.prototype.validateMethod = function (method) {
    if (!this._app[method] || !_.isFunction(this._app[method])) {
        logger.warn("ServiceManager: Invalid method", method);
        return false;
    } else {
        return true;
    }
};

HttpFramework_Express.prototype.getName = function () {
    return 'express';
};

HttpFramework_Express.prototype.app = function () {
    return this._app;
};

/*
HttpFramework_Express.prototype.server = function() {
    return this._server;
};
*/

HttpFramework_Express.prototype.addMethodFunction = function (method, middlewareList, routeStr, handler) {

    var validMiddlewares = [];
    if (middlewareList) {
        for (var i = 0; i < middlewareList.length; i++) {
            // if plugin has isType, is express and has setupRoute function
            // filter out all invalid plugins
            if (middlewareList[i] && middlewareList[i].middleware && _.isFunction(middlewareList[i].middleware.isType) && middlewareList[i].middleware.isType('express') && _.isFunction(middlewareList[i].middleware.setupRoute)) {

                validMiddlewares.push(middlewareList[i]);
            } else {
                // missing isType or
                // is not express or
                // setupRoute function
            }
        }
    }

    if (validMiddlewares && _.isArray(validMiddlewares) && validMiddlewares.length) {

        // run setupRoute for each plugin
        _.forEach(validMiddlewares, function (validMiddleware) {
            validMiddleware.middleware.setupRoute(this._app, method, routeStr, handler, validMiddleware.options);
        }.bind(this));
    }

    this._app[method](routeStr, handler);
};

HttpFramework_Express.prototype.addStaticDir = function (staticDir, staticRoute) {
    if (staticRoute) {
        return this._app.use(staticRoute, express.static(staticDir));
    } else {
        return this._app.use(express.static(staticDir));
    }
};

HttpFramework_Express.prototype.addStaticFile = function (staticRoute, staticFile) {
    this._app.get(staticRoute, function (req, res) {
        res.sendFile(path.resolve(staticFile));
    }.bind(this));
};

HttpFramework_Express.prototype.addStaticFileDefault = function (staticFile) {
    this._app.use(function (req, res) {
        res.sendFile(path.resolve(staticFile));
    }.bind(this));
};

HttpFramework_Express.prototype.addRedirect = function (from, to) {
    return this._app.use(from, function (req, res) {
        res.redirect(to);
    }.bind(this));
};

// custom logging function to add 'x-forwarded-for' and defaults for missing values
HttpFramework_Express.prototype._getExpressLogger = function () {
    morgan.token('remote-addy', function (req, res) {
        if (req.headers.hasOwnProperty('x-forwarded-for')) {
            return req.headers['x-forwarded-for'];
        } else {
            return req.connection.remoteAddress;
        }
    });

    /*
     var logFormat = ':remote-addy - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" (:response-time ms)';
     return express.logger(logFormat);
    */
    return morgan(function (t, req, res) {
        var rTime = t['response-time'](req, res);
        var contentLength = t.res(req, res, 'content-length');
        var status = t.status(req, res);
        var url = t.url(req, res);

        return t['remote-addy'](req, res) + ' - - [' + t.date(req, res) + '] "' + t.method(req, res) + ' ' + url + ' HTTP/' + t['http-version'](req, res) + '" ' + status + ' ' + (contentLength || '-') + ' "' + (t.referrer(req, res) || '-') + '" "' + (t['user-agent'](req, res) || '-') + '" (' + rTime + ' ms)';
    });
};

// inject dependency from controller function DI
HttpFramework_Express.prototype.buildInputs = function ($rawRequest) {
    // POST - req.body
    // GET  - req.query
    // GET  - req.params
    return _.pick($rawRequest, ["query", "params", "body"]);
};

// type == "view"
// route.outContentType
// templateFunc
HttpFramework_Express.prototype.addWrappedMethodFunction = function (method, middlewareList, routeStr, handler) {

    this.addMethodFunction(method, middlewareList, routeStr, function (req, res, next) {
        var responded = false;

        handler(this.buildInputs(req), req.session, req.cookies, req, res, next).then(function (output) {
            // ---------------------------------------
            // TODO: Custom error format, defined in config
            if (responded) {
                logger.warn("Already responded to request");
                return;
            }

            responded = true;
            if (!output.headers || !_.isObject(output.headers)) {
                output.headers = {};
            }

            if (output.headers.filename) {
                var mimetype = mime.lookup(output.headers.filename);
                if (!output.headers.hasOwnProperty('Content-type')) {
                    output.headers['Content-type'] = mimetype;
                }
                if (!output.headers.hasOwnProperty('Content-disposition')) {
                    output.headers['Content-disposition'] = 'attachment; filename=' + output.headers.filename;
                }
            }

            // is not buffer and is object
            if (!Buffer.isBuffer(output.data) && _.isObject(output.data)) {

                // assume JSON
                if (!output.headers.hasOwnProperty('Content-type')) {
                    output.headers['Content-Type'] = "application/json";
                }
                // convert object to string
                output.data = (0, _stringify2.default)(output.data);
            } else if (_.isString(output.data)) {
                // assume HTML
                if (!output.headers.hasOwnProperty('Content-type')) {
                    output.headers['Content-Type'] = "text/html";
                }
            } else {}
            // ???


            // if not code passed in, default 200
            if (!output.code) {
                output.code = 200;
            }

            // merge default content-type with headers
            res.writeHead(output.code, output.headers);

            if (Buffer.isBuffer(output.data)) {
                res.end(output.data, 'binary');
            } else {
                res.end(output.data);
            }

            // TOOD: duplicate setHeader error with proper pipeline
            //next();
        }.bind(this));
    }.bind(this));
};

/**
 * Validate Inputs
 * TODO: replace with lib
 * @param cInput
 * @param req
 * @returns {Array}
 * @private
 */
HttpFramework_Express.prototype.validateInputs = function (cInput, req) {
    var errors = [];

    for (var i in cInput) {
        //logger.log("_validateInputs:" , i);

        // check input type
        if (req.hasOwnProperty(i)) {

            for (var k in cInput[i]) {
                // check required
                if (!req[i].hasOwnProperty(k) && cInput[i][k].required) {
                    // missing
                    errors.push({ error: "Missing " + i + " " + k, type: "missing", id: k });
                }
                // check type
                else if (req[i].hasOwnProperty(k) && cInput[i][k].type) {

                        var tFuncName = "is" + util.String.capitalize(cInput[i][k].type);
                        // check if lodash has type function
                        if (_[tFuncName]) {
                            // check if input passes type function
                            if (!_[tFuncName](req[i][k])) {
                                errors.push({ error: "Invalid input " + k + " with value " + req[i][k] + ", expecting type " + i, type: "invalid", id: k });
                            }
                        }
                    }
            }
        }
    }

    if (errors.length === 0) {
        errors = undefined;
    }
    if (errors.length === 1) {
        errors = errors[0];
    }
    return errors;
};