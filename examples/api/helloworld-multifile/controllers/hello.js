'use strict';

module.exports = HelloCtrl;

function HelloCtrl () {
  this.data = { hello: 'world' };
}

// localhost:8000/hello
HelloCtrl.prototype.hello = function ($done) {
  $done(this.data);
};

// localhost:8000/world
HelloCtrl.prototype.world = function () {
  return this.data;
};
