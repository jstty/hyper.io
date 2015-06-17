'use strict';

/**
 * Dependency Injector for Service Manager
 *
 */
var _            = require('lodash');
var di           = require('di');
var when         = require('when');
//
var util         = require('./util.js');
var logger = null;

module.exports = DI;

/* ---------------------------------------------------
 * Constructor
 * --------------------------------------------------- */
function DI(hyperCore, serviceRouter) {
    // TODO: statsD
    //this.stats     = new util.Stats(this.options, "ServiceManager");
    logger = util.logger('DI');

    this.baseModule = {};
    this.add({
        '$_':           _,
        '$q':           when,
        '$logger':      logger,
        '$hyper':       hyperCore,
        '$services':    serviceRouter
    });
}

// add(this._resources); // add list
// add('$config', parent.config) // add one
//
DI.prototype.add = function(opt1, opt2) {
    var list = {};
    var value = "";
    if(_.isString(opt1)) {
        list[opt1] = opt2;
    }
    else if(_.isObject(opt1)) {
        list = opt1;
    }

    for(var rKey in list) {
        this.baseModule[rKey] = ['value', list[rKey].instance || list[rKey]];
    }
};

DI.prototype.setParent = function(parent) {
    this._parent = parent;

    if( parent &&
        parent.hasOwnProperty('config')) {
        this.baseModule['$config'] = ['value', parent.config];
    }
};

//this._injectionDependency(module, service, controller, cFunc);

DI.prototype.inject = function(func, module) {
    // ---------------------------------------
    // injection dependency to Controller function
    // NOTE: di does not work when you use cFunc.bind(...) as it hides the function arguments
    if(module) {
        module = _.merge(this.baseModule, module);
    } else {
        module = this.baseModule;
    }

    // creates injector
    var injector = (new di.Injector( [module] ) );

    // run function
    if(_.isFunction(func)) {
        if(this._parent) {
            return injector.invoke( func, this._parent );
        } else {
            return injector.invoke( func, func );
        }
    }
    else if(this._parent) {
        var InjectedWrapper = function() {
            return injector.invoke( this._parent.module, this );
        }.bind(this);
        InjectedWrapper.prototype = _.merge(InjectedWrapper.prototype, this._parent.module.prototype);

        return InjectedWrapper;
    } else {
        logger.error('no function and no parent');
    }
    // ---------------------------------------
};

// TODO: returns an object that contains a function that will add DI to any function
DI.prototype.getInjector = function() {
    return {
        inject: function(func, module){

        }.bind(this)
    };
};