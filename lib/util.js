'use strict';

/**
 * Util Module
 *
 * Module dependencies:
 *   when - https://github.com/cujojs/when
 *
 */
var path   = require('path');
//
var when   = require('when');
var _      = require('lodash');
var stumpy = require('stumpy');

// singleton logger
var logger = null;

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function promiseContinue(val){
    return when.promise( function(resolve){
        resolve(val);
    });
}

// build valid URI/URL
function buildUri(options, path) {
    var uri = "";

    if(options.protocol) {
        uri += options.protocol+"//";
    } else {
        uri += "http://";
    }

    if(options.host) {
        uri += options.host;
    } else {
        uri += "localhost";
    }

    if(options.port) {
        uri += ":"+options.port;
    }

    if(path && _.isString(path)) {
        // make sure first char is a slash
        if(path.charAt(0) != '/') {
            uri += "/";
        }
        uri += path;
    }

    return uri;
}

function getLogger(options){
    if(!logger) {
        logger = stumpy(options);
        return logger;
    } else {
        if(_.isString(options)) {
            var name = options;
            options = logger.getOptions();
            options.name = name;
        }

        return logger.shadow(options);
    }
}

function filterNodeModules(list) {
    return _.filter(list, function(item){
        return (item.indexOf('node_modules') == -1);
    });
}

// http://stackoverflow.com/questions/10865347/node-js-get-file-extension
function getFileExtension(filename) {
    var ext = path.extname(filename||'').split('.');
    return ext[ext.length - 1];
}

module.exports = {
    promiseContinue:  promiseContinue,
    buildURI:         buildUri,
    string: {
        capitalize:   capitalize
    },
    getLogger:        getLogger,
    getFileExtension: getFileExtension,
    filterNodeModules: filterNodeModules
};
