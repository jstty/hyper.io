'use strict';

var _ = require('lodash');

var util = require('./util.js');
var logger = null;

var ServiceAdapterHTTP = require('./router.service.adapter.http.js');
var ServiceAdapterInternal = require('./router.service.adapter.http.js');

/**
 * Router for Services
 *
 */
module.exports = ServiceRouter;

/* ---------------------------------------------------
 * Constructor
 * --------------------------------------------------- */
function ServiceRouter(options) {
    this._services = {};
    // TODO: statsD
    //this.stats     = new util.Stats(this.options, "ServiceManager");
    logger = util.logger('ServiceRouter');

    this._options = _.merge({
        port: '8000',
        protocal: 'http:'
    }, options);
}

/* ---------------------------------------------------
 * Public Functions
 * --------------------------------------------------- */
ServiceRouter.prototype.config = function (data) {
    if (_.isObject(data)) {
        this._servicesConfig = data;
    }
    return this._servicesConfig;
};

// add an internal/external service
// add('serviceName') // default {adapter: 'internal'}
// add('serviceName', 'internal');
// add('serviceName', { adapter: 'internal'});
// add({ name: 'serviceName', adapter: 'internal'});
ServiceRouter.prototype.add = function (serviceOpt1, serviceOpt2) {
    var service = {};

    if (_.isString(serviceOpt1)) {
        service.name = serviceOpt1;
    } else if (_.isObject(serviceOpt1)) {
        serviceOpt2 = serviceOpt1;
    } else if (_.isArray(serviceOpt1)) {
        // if array, just call it's self in loop and then return
        for (var i = 0; i < serviceOpt1.length; i++) {
            this.add(serviceOpt1[i]);
        }
        return;
    } else {
        logger.error('invalid data type');
        return;
    }

    if (serviceOpt2) {
        if (_.isString(serviceOpt2)) {
            service.type = serviceOpt2;
        } else if (_.isObject(serviceOpt2)) {
            if (serviceOpt2.name) {
                service.name = serviceOpt2.name;
            }

            if (serviceOpt2.adapter && _.isString(serviceOpt2.adapter)) {
                service.type = serviceOpt2.adapter;
            } else if (serviceOpt2.adapter && _.isObject(serviceOpt2.adapter)) {
                service.type = 'custom';
                service.adapter = serviceOpt2.adapter;
            }

            if (serviceOpt2.options) {
                service.options = _.cloneDeep(serviceOpt2.options);
            }
        }
    } else {
        service.type = 'internal';
    }

    // if no service name, give it one,
    // always need a service name
    if (!service.name) {
        service.name = 'MainService';
    }

    if (service.type === 'http') {
        service.adapter = new ServiceAdapterHTTP(service.options);
    } else if (service.type === 'internal') {
        service.options = {
            hostname: '127.0.0.1',
            port: this._options.port,
            protocol: this._options.protocol
        };

        service.adapter = new ServiceAdapterHTTP(service.options);
    } else if (service.type === 'custom') {} else {
        logger.error('could not find service adapter of type:', service.type);
    }

    // add service to service list
    this._services[service.name] = service;
    return service;
};

// returns an service wrapper for internal/external services
ServiceRouter.prototype.find = function (name) {
    var service = this._services[name];
    if (!service) {
        logger.error('could not find service:', name);
    } else {
        return service.adapter;
    }
};

// this is ok