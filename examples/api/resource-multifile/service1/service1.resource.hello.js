'use strict';

module.exports = resourceHello;

function resourceHello() {
    this._data = {};
}

// AUTO run when resource is created by Hyper.io
resourceHello.prototype.$init = function($q, $logger) {
    var deferer = $q.defer();

    $logger.log('service1.resourceHello Init Running...');
    setTimeout(function() {
        this._data = {
            hello: "world service 1 resource",
            ts: new Date()
        };

        $logger.log('service1.resourceHello Init Done.');
        deferer.resolve();
    }.bind(this), 2 * 1000);

    return deferer.promise;
};

resourceHello.prototype.world = function() {
    return this._data;
};
