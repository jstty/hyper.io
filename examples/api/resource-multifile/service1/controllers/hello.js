'use strict';

module.exports = HelloCtrl;

function HelloCtrl ($logger) {
  $logger.log('Service 1 - Hello Ctrl Init');
}

// localhost:8000/service1/hello
HelloCtrl.prototype.world = function ($done, s1Hello) {
  $done(s1Hello.world());
};
