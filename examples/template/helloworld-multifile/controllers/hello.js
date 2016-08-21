'use strict';

module.exports = HelloCtrl;

function HelloCtrl () {
}

// localhost:8000/hello
HelloCtrl.prototype.world = function ($done) {
  $done({
    hello: 'world',
    ts:    Date.now()
  });
};
