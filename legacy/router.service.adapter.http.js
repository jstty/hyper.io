'use strict';

var url = require('url');

var _ = require('lodash');
var request = require('request');
var when = require('when');

var util = require('./util.js');
var logger = null;

/**
 * Router for Services
 *
 */
module.exports = ServiceHTTPAdapter;

/* ---------------------------------------------------
 * Constructor
 * --------------------------------------------------- */
function ServiceHTTPAdapter(options) {
    logger = util.logger('ServiceHTTPAdapter');

    this._options = _.merge({
        hostname: '127.0.0.1',
        port: '8000',
        protocol: 'http:'
    }, options);

    request = request.defaults({
        headers: {
            'User-Agent': 'Hyper.io/' + util.version()
        }
    });

    if (options.host) {
        this._options.host = options.host;
    }
}

/* ---------------------------------------------------
 * Private Functions
 * --------------------------------------------------- */
ServiceHTTPAdapter.prototype._buildURI = function (path, data) {
    var uri = {
        pathname: path || '/'
    };
    uri = _.merge(uri, this._options); // add host/port/protocal options

    if (data) {
        uri = _.merge(uri, data); // add search/query/hash options
    }

    return url.format(uri);
};

ServiceHTTPAdapter.prototype._request = function (method, path, data, body) {
    // add promise wrapper
    return when.promise(function (resolve, reject) {
        // ------------------------------------------------
        request({
            method: method,
            uri: this._buildURI(path, data),
            body: body,
            json: _.isObject(body)
        }, function (error, response, body) {
            if (error) {
                reject(error);
                return;
            }

            // try to convert to JSON object
            try {
                body = JSON.parse(body);
            } catch (err) {
                // this is ok
            }

            if (response.statusCode != 200) {
                reject(body);
            } else {
                resolve(body);
            }
        });
        // ------------------------------------------------
    }.bind(this));
    // end promise wrapper
};

/* ---------------------------------------------------
 * Public Functions
 * --------------------------------------------------- */
ServiceHTTPAdapter.prototype.get = function (path, data) {
    return this._request('GET', path, data);
};
ServiceHTTPAdapter.prototype.post = function (path, body) {
    return this._request('POST', path, null, body);
};
ServiceHTTPAdapter.prototype.put = function (path, body) {
    return this._request('PUT', path, null, body);
};
ServiceHTTPAdapter.prototype.delete = function (path, data) {
    return this._request('DELETE', path, data);
};