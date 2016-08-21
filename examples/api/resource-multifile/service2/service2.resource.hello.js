'use strict';

module.exports = resourceHello;

function resourceHello () {
  this._data = {
    hello: 'world service 2 resource'
  };
}

// AUTO run after the server has start, use for all Service to Service Init Com
resourceHello.prototype.$postStartInit = function ($q, $services, $logger) {
  $logger.log('service2.resourceHello Post Start Init Running...');

  // get "ts" data from service1
  return $services.find('service1')
    .get('/service1/hello')
    .then(function (data) {
      $logger.log('service1.resourceHello Post Start Init Done.');
      this._data.ts = data.ts;
    }.bind(this));
};

resourceHello.prototype.world = function () {
  return this._data;
};
