'use strict';

module.exports = HelloCtrl;

function HelloCtrl () {
}

// localhost:8000/hello
HelloCtrl.prototype.hello = function ($done, data) {
  $done(data);
};
