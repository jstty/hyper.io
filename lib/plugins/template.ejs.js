'use strict';

var ejs        = require('ejs');
var _          = require('lodash');

module.exports = Plugin_Template_EJS;

function Plugin_Template_EJS(options) {
    this._options = _.merge({
        // default
    }, options);

    this.validFileExts = ['ejs'];
}

Plugin_Template_EJS.prototype.init = function() {
    // do nothing
};

Plugin_Template_EJS.prototype.isValidData = function(templateData) {
    if(templateData.indexOf('<%') != -1) {
        return true;
    } else {
        return false
    }
};

Plugin_Template_EJS.prototype.isValidFileExtension = function(fileExt) {
    return _.contains(this.validFileExts, fileExt);
};

Plugin_Template_EJS.prototype.compile = function(templateData) {
    return ejs.compile(templateData);
};
