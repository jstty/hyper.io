'use strict';

module.exports = resourceHello;

function resourceHello () {
}

resourceHello.prototype.world = function () {
  return {
    hello: 'world resource',
    ts:    new Date()
  };
};
