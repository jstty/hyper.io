'use strict';

var _    = require('lodash');

module.exports = UserCtrl;

function UserCtrl($service, options){
    this.$service = $service;

    this.options  = _.merge({
    }, options);
}

UserCtrl.prototype.info = function($input, $done, $error, $fatal, $rawRequest, $rawResponse, $next) {
    //console.log("info", $input, $done, $error, $fatal, $rawRequest, $rawResponse, $next);

    if($done) {
        $done("hello world");
    }
};
