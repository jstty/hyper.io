'use strict';

var fs   = require('fs');
var path = require('path');
var _    = require('lodash');

module.exports = MainService;

function MainService(options){
    this.options = _.merge({
    }, options);
}

MainService.prototype.load = function() {

};
