'use strict';

var _          = require('lodash');
var basicAuth  = require('basic-auth');

module.exports = Express_Plugin_Route_AuthBasic;

function Express_Plugin_Route_AuthBasic(options) {
    this._options = _.merge({
        // default
    }, options);
}

Express_Plugin_Route_AuthBasic.prototype.init = function() {
    // do nothing
};

Express_Plugin_Route_AuthBasic.prototype.isType = function(type) {
    return (type === 'express');
};

Express_Plugin_Route_AuthBasic.prototype.setupRoute = function(app, method, routeStr, func, options) {
    var auth = function (req, res, next) {
        function unauthorized(res) {
            res.set('WWW-Authenticate', 'Basic realm='+(options.message || 'Authorization Required') );
            return res.send(401);
        }

        var user = basicAuth(req);
        if (!user || !user.name || !user.pass) {
            return unauthorized(res);
        }

        if ( user.name === options.user &&
             user.pass === options.pass ) {
            return next();
        } else {
            return unauthorized(res);
        }
    };

    app[ method ](routeStr, auth, func);
};
