'use strict';

module.exports = resourceHello;

function resourceHello () {
  this._data = { hello: '' };
}

// AUTO run when resource is created by Hyper.io
resourceHello.prototype.$init = function ($q, $logger) {
  var deferer = $q.defer();

  $logger.log('service1.resourceHello Init Running...');
  setTimeout(function () {
    // only set if hello was set in service constructor
    if (this._data.hello === '123') {
      this._data = {
        hello: 'world service 1 resource',
        ts:    new Date()
      };
    }

    $logger.log('service1.resourceHello Init Done.');
    deferer.resolve('service1');
  }.bind(this), 2 * 1000);

  return deferer.promise;
};

resourceHello.prototype.world = function () {
  return this._data;
};
