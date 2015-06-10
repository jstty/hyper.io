'use strict';

/**
 * Pipeline Resolver
 *
 */
var _            = require('lodash');
var di           = require('di');
var whenKeys     = require('when/keys');

module.exports = PipelineResolver;

/* ---------------------------------------------------
 * Constructor
 * --------------------------------------------------- */
function PipelineResolver() {
}

PipelineResolver.prototype.getName = function() {
    return 'resolver';
};

PipelineResolver.prototype.getProps = function() {
    return ['resolve'];
};

PipelineResolver.prototype.setup = function(route, module) {
    this._diModule = module || {};
};

// DI
PipelineResolver.prototype.run = function(resolve) {
    var promise = null;

    var resolved = {};
    // run the resolveFuncs
    _.forEach(resolve, function(func, key) {
        // dependency injection
        var injector = new di.Injector( [this._diModule] );
        resolved[key] = injector.invoke( func );

    }.bind(this));

    // promise map to save data to key
    promise = whenKeys.map(resolved, function(value, key){
        resolved[key] = value;
    }.bind(this));

    promise = promise.then(function(){
        // add resolved to DI
        _.forEach(resolved, function(value, key) {
            this._diModule[key] = ['value', value];
        }.bind(this));

    }.bind(this));

    return promise;
};
