'use strict';

function promiseDelay ($q, func) {
  var deferer = $q.defer();

  setTimeout(function () {
    deferer.resolve(func());
  }, 50);

  return deferer.promise;
}

class HelloCtrl {
  constructor ($logger) {
    this.logger = $logger;
  }

    // localhost:8000/hello
  hello ($done, $q) {
    this.logger.info('/hello - defer request with timeout');
    return promiseDelay($q, function () {
      return { hello: 'world promise' };
    });
  }

    // localhost:8000/world
  * world ($done, $q) {
    this.logger.info('/world - yielded request with timeout');

    var data = yield promiseDelay($q, function () {
      return { hello: 'world yield' };
    });

    $done(data);
  }
}

// node 4/5 does not support export class
module.exports = HelloCtrl;
