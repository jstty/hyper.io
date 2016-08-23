'use strict';

module.exports = HelloCtrl;

function HelloCtrl () {
  this.data = { hello: 'world' };
}

// localhost:8000/hello
HelloCtrl.prototype.hello = function ($done, $config) {
  $done($config);
};

// localhost:8000/world
HelloCtrl.prototype.world = function () {
  return this.data;
};

// localhost:8000/test
HelloCtrl.prototype.test = function (main1, main2) {
  // return main2.test2();
  return main1.test1();
};
