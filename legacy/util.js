'use strict';

/**
 * Util Module
 *
 * Module dependencies:
 *   when - https://github.com/cujojs/when
 *
 */
var path = require('path');
//
var when = require('when');
var _ = require('lodash');
var stumpy = require('stumpy');

// singleton logger
var _logger = null;
var _loggerOptions = {};
var _currentVersion = require('../package.json').version;

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function randomString(len) {
    var out = "";
    var alphaNum = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < len; i++) {
        out += alphaNum.charAt(Math.floor(Math.random() * alphaNum.length));
    }

    return out;
}

function promiseContinue(val) {
    return when.promise(function (resolve) {
        resolve(val);
    });
}

// build valid URI/URL
function buildUri(options, path) {
    var uri = "";

    if (options.protocol) {
        uri += options.protocol + "//";
    } else {
        uri += "http://";
    }

    if (options.host) {
        uri += options.host;
    } else {
        uri += "localhost";
    }

    if (options.port) {
        uri += ":" + options.port;
    }

    if (path && _.isString(path)) {
        // make sure first char is a slash
        if (path.charAt(0) != '/') {
            uri += "/";
        }
        uri += path;
    }

    return uri;
}

function logger(options) {
    if (_.isString(options)) {
        _loggerOptions.name = options;
    } else if (_.isObject(options)) {
        _loggerOptions = _.merge(_loggerOptions, options);
    }

    if (!_logger) {
        _logger = stumpy(_loggerOptions);
        return _logger;
    } else {
        // TODO: better way to copy options from logger to logger
        var opt = _logger.getOptions();
        _loggerOptions.env = opt.env;

        return _logger.shadow(_loggerOptions);
    }
}

function filterNodeModules(list) {
    return _.filter(list, function (item) {
        item = item.replace(process.cwd(), '');
        return item.indexOf('node_modules') == -1;
    });
}

// http://stackoverflow.com/questions/10865347/node-js-get-file-extension
function getFileExtension(filename) {
    var ext = path.extname(filename || '').split('.');
    return ext[ext.length - 1];
}

function version(cVersion) {
    if (cVersion) {
        _currentVersion = cVersion;
    }

    return _currentVersion;
}

function isES6() {
    try {
        eval('class testES6{ constructor(){} }');
    } catch (err) {
        return false;
    }

    return true;
}

module.exports = {
    promiseContinue: promiseContinue,
    buildURI: buildUri,
    string: {
        capitalize: capitalize,
        random: randomString
    },
    logger: logger,
    getFileExtension: getFileExtension,
    filterNodeModules: filterNodeModules,
    version: version,
    isES6: isES6
};