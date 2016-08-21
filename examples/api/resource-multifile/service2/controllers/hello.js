'use strict';

module.exports = HelloCtrl;

function HelloCtrl ($logger) {
  $logger.log('Service 2 - Hello Ctrl Init');
}

// localhost:8000/service2/hello
HelloCtrl.prototype.world = function ($done, s2Hello) {
  $done(s2Hello.world());
};
