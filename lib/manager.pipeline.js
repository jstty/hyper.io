'use strict';

/**
 * Pipeline Manager
 *
 */
var _            = require('lodash');
var di           = require('di');

var util         = require('./util.js');

var logger = null;

module.exports = PipelineManager;

/* ---------------------------------------------------
 * Constructor
 * --------------------------------------------------- */
function PipelineManager() {
    this._list = [];
}

PipelineManager.prototype.add = function(piplineMod){
    var mod = new piplineMod();

    var item = {
        name:  mod.getName(),
        props: mod.getProps(),
        mod:   mod
    };

    this._list.push(item);
};


PipelineManager.prototype.run = function(route, module) {

    module['$pData'] =  ['value', {
        data: {},
        code: 200,
        contentType: route.contentType || 'text/html',
        headers: []
    }];

    // add all props in pipeline to module for DI
    for(var i = 0; i < this._list.length; i++) {

        // if setup, then pass routes and module for DI internally to pipeline
        if( this._item[i].mod.setup &&
            _.isFunction(this._item[i].mod.setup)
        ) {
            this._item[i].mod.setup(route, module);
        }

        _.forEach(this._item[i].props, function (prop) {
            module[prop] = ['value', route[prop] || {}];
        }.bind(this));
    }

    this._runItem(0, route, module)
        .then(function(pdata){
            if(pdata) {
                module['$pData'] =  ['value', pdata];
            }

            // DI
            var injector = new di.Injector( [module] );
            injector.invoke( this._finalTask, this );

        }.bind(this));
};

PipelineManager.prototype._runItem = function(index, route, module) {
    if(index > this._list.length) {
        return;
    }
    var item = this._list[index];

    // DI
    var injector = new di.Injector( [module] );
    var promise = injector.invoke( item.mod.run, item.mod );

    // pipeline, on complete of current task, start next one
    return promise.then(function(pdata){
        if(pdata) {
            module['$pData'] =  ['value', pdata];
        }

        index++;
        return this._runItem(route, module);
    }.bind(this));
};

PipelineManager.prototype._finalTask = function($rawResponse, $pData){
    // ---------------------------------------
    // General Response function
    var out     = $pData.data;
    var code    = $pData.code;
    var headers = $pData.headers;

    var outContentType = $pData.contentType;
    //logger.log("responseFunc out:", out);s

    if(_.isObject(out)) {
        // assume JSON
        outContentType = outContentType || "application/json";
        out = JSON.stringify(out);
    } else {
        // assume HTML
        outContentType = outContentType || "text/html";
    }

    // merge default content-type with headers
    $rawResponse.writeHead(code, _.merge({
        "Content-Type": outContentType
    }, headers));
    $rawResponse.end( out );
    // ---------------------------------------
};

/*
    // ---------------------------------------
    // Run resolvers
    // ---------------------------------------
    else if(pipeline === 'resolver') {
        t = function(pdata){
            var resolved = {};
            // run the resolveFuncs
            _.forEach(route.resolve, function(func, key) {
                // TODO: dependency injection
                resolved[key] = func();
            }.bind(this));
            // promise map to save data to key
            promise = whenKeys.map(resolved, function(value, key){
                resolved[key] = value;
            });

            promise = promise.then(function(){

                // add resolved to DI
                _.forEach(resolved, function(value, key) {
                    module[key] = ['value', value];
                }.bind(this));

            }.bind(this));

            return promise;
        }.bind(this);
    }
    // ---------------------------------------
    // Run controller
    // ---------------------------------------
    else if(pipeline === 'controller'){
        t = function(pdata) {
            return when.promise(function(resolve) {
                var responded = false;

                function next(data, code, headers){
                    if(responded) {
                        logger.warn("Already responded to request");
                        return;
                    }
                    responded = true;

                    pdata = { data: data, code: code, headers: headers };
                    pdata.contentType = "application/json";
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

                module['$next']  = ['value',   next];
                module['$done']  = ['value',   done];
                module['$error'] = ['value',   error];
                module['$fatal'] = ['value',   fatal];

                this._injectionDependency(module, service, controller, cFunc);

            }.bind(this));
        }.bind(this);
    }
    // ---------------------------------------
    // Run template
    // ---------------------------------------
    else if(pipeline === 'template'){
        t = function(pdata) {
            pdata.data = templateFunc(pdata.data);
            return pdata;
        }.bind(this);
    }

    tasks.push(t);
}.bind(this));
*/
