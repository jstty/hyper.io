'use strict';

var Hapi = require('hapi');

//
var Util = require('./util.js');
var logger = null;

module.exports = HttpFramework_Hapi;

function HttpFramework_Hapi(options){
    this._options = _.merge({
        env:  'dev',
        port: 8000,
        host: 'localhost'
    }, options);

    logger = Util.getLogger('HttpFramework_Hapi');

    // Create a server with a host and port
    this._server = new Hapi.Server(process.env.HOST || this._options.host,
                                   process.env.PORT || this._options.port);
}

// load all services
HttpFramework_Hapi.prototype.load = function() {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    // add logger
    // TODO: replace with custom plugin to make logging consistent with express
    this._server.pack.register({
        plugin: require('bucker'),
        options: {
            console: {
                color: true,
                timestamp: 'YYYY-MM-DD HH:mm:ss Z',
                accessFormat: ':remote - - [:time] ":method :url HTTP/:http_ver" :status :length ":referer" ":agent" (:res_time)'
            }
        }
    }, function (err) {
        if (err) {
            console.error(err);
            return;
        }
    });

    if(this._options.compress) {
        // TODO: gzip compression
    }
    if(this._options.urlencoded) {
        // TODO: urlencoded
    }
    if(this._options.parser.cookies) {
        // TODO: cookies parser
    }
    if(this._options.parser.body) {
        // TODO: body parser
    }
    if(this._options.parser.json) {
        // TODO: json parser
    }

    if(this._options.session) {
        // if this._options.session no object then make default settings
        if(!_.isObject(this._options.session)) {
            this._options.session = {
                secret: "keyboard kitty",
                cookie: {
                    path: '/',
                    httpOnly : false,
                    maxAge: 1000 * 60 * 24 // 24 hours
                },
                storeInst: new express.session.MemoryStore()
            };
        }

        // TODO: session
    }

    resolve();
// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

HttpFramework_Hapi.prototype.start = function() {
    // Start the server
    this._server.start();
};

HttpFramework_Hapi.prototype.validateMethod = function(method) {
    method = method.toUpperCase();
    if( method == "GET"     ||
        method == "POST"    ||
        method == "PUT"     ||
        method == "DELETE"  ||
        method == "HEAD"    ||
        method == "OPTIONS" ||
        method == "TRACE"   ||
        method == "CONNECT" ) {
        return true;
    } else {
        return false;
    }
};

HttpFramework_Hapi.prototype.addMethodFunction = function(method, route, func) {
    method = method.toUpperCase();

    // Add the route
    server.route({
        method: method,
        path:   route,
        handler: func
    });
};

HttpFramework_Hapi.prototype.addStaticDir = function(staticDir) {

};

HttpFramework_Hapi.prototype.addStaticFile = function(staticRoute, staticFile) {

};

HttpFramework_Hapi.prototype.addStaticFileDefault = function(staticFile) {

};

HttpFramework_Hapi.prototype.addRedirect = function(from, to) {

};
