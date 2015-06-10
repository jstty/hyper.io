'use strict';

/**
 * Pipeline Controller
 *
 */
var _            = require('lodash');
var when         = require('when');

module.exports = PipelineController;

/* ---------------------------------------------------
 * Constructor
 * --------------------------------------------------- */
function PipelineController() {
}

PipelineController.prototype.getName = function() {
    return 'controller';
};

PipelineController.prototype.getProps = function() {
    return ['controller'];
};

PipelineController.prototype.setup = function(route, module) {
    this._diModule = module || {};
};

// DI
PipelineController.prototype.run = function() {
    return when.promise(function(resolve) {
        var responded = false;

        function next(data, code, headers){
            if(responded) {
                logger.warn("Already responded to request");
                return;
            }
            responded = true;

            var pdata = {
                data: data,
                code: code,
                headers: headers,
                contentType: "application/json"
            };
            resolve(pdata);
        }

        var done = function(data, code, headers) {
            next(data, code || 200, headers);
        };
        var error = function(out, code, headers) {
            next(data, code || 400, headers);
        };
        var fatal = function(out, code, headers) {
            next(data, code || 500, headers);
        };

        this._diModule['$next']  = ['value',   next];
        this._diModule['$done']  = ['value',   done];
        this._diModule['$error'] = ['value',   error];
        this._diModule['$fatal'] = ['value',   fatal];

        // TODO: what to do with this
        // service, controller and cFunc
        this._injectionDependency(this._diModule, service, controller, cFunc);
    }.bind(this));
};

PipelineController.prototype._injectionDependency = function(module, service, parent, func) {
    // ---------------------------------------
    // injection dependency to Controller function
    // NOTE: di does not work when you use cFunc.bind(...) as it hides the function arguments
    module = _.merge({
        '$logger':      ['value', logger],
        '$q':           ['value', when],
        '_':            ['value', _],
        '$hyper':       ['value', this._hyperCore],
        '$services':    ['value', this._serviceRouter]
    }, module);

    if( parent &&
        parent.hasOwnProperty('config')) {
        module['$config'] = ['value', parent.config];
    }

    // add all _resources to list for DI
    for(var rKey in this._resources) {
        module[rKey] = ['value', this._resources[rKey].instance];
    }

    // add all service.resources to list for DI
    if(service) {
        for(var rKey in service.resources) {
            module[rKey] = ['value', service.resources[rKey].instance];
        }
    }

    // creates injector
    var injector = (new di.Injector( [module] ) );

    // run function
    if(func) {
        return injector.invoke( func, parent );
    }
    else {
        if(parent) {
            var InjectedWrapper = function() {
                return injector.invoke( parent.module, this );
            };
            InjectedWrapper.prototype = _.merge(InjectedWrapper.prototype, parent.module.prototype);

            return InjectedWrapper;
        }
    }
    // ---------------------------------------
};