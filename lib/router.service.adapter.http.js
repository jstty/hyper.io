'use strict';

var url     = require('url');

var _       = require('lodash');
var request = require('request');
var when    = require('when');

var util    = require('./util.js');
var logger  = null;

/**
 * Router for Services
 *
 */
module.exports = ServiceHTTPAdapter;

/* ---------------------------------------------------
 * Constructor
 * --------------------------------------------------- */
function ServiceHTTPAdapter(options){
    logger = util.logger('ServiceHTTPAdapter');

    this._options = _.merge({
        hostname: '127.0.0.1',
        port:     '8000',
        protocol: 'http:'
    }, options);

    request.defaults({
        headers: {
            'User-Agent': 'Hyper.io/'+util.version()
        }
    });

    if(options.host) {
        this._options.host = options.host;
    }
}

/* ---------------------------------------------------
 * Private Functions
 * --------------------------------------------------- */

/* ---------------------------------------------------
 * Public Functions
 * --------------------------------------------------- */
ServiceHTTPAdapter.prototype.get = function(path, data) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    var uri = {
        pathname: path || '/'
    };
    uri = _.merge(uri, this._options); // add host/port/protocal options
    uri = _.merge(uri, data); // add search/query/hash options
    uri = url.format(uri);

    var options = {
        uri: uri
    };

    request.get(options,
        function (error, response, body) {
            if(error) {
                reject(error);
                return;
            }

            if(response.statusCode != 200) {
                reject(body);
            } else {
                resolve(body)
            }
        });
// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

ServiceHTTPAdapter.prototype.post = function(path, data) {
    // TODO
};

ServiceHTTPAdapter.prototype.put = function(path, data) {
    // TODO
};

ServiceHTTPAdapter.prototype.delete = function(path, data) {
    // TODO
};
