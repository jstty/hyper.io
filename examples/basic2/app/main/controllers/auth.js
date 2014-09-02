'use strict';

var _    = require('lodash');

module.exports = AuthCtrl;

function AuthCtrl($service, options){
    this.$service = $service;

    this.options  = _.merge({
    }, options);

}


AuthCtrl.prototype.login = function() {

};

