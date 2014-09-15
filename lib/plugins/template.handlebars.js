'use strict';

var handlebars = require('handlebars');
var _          = require('lodash');

module.exports = Plugin_Template_Handlebars;

function Plugin_Template_Handlebars(options) {
    this._options = _.merge({
        // default
    }, options);

    this.validFileExts = ['handlebars', 'hbs'];
}

Plugin_Template_Handlebars.prototype.init = function() {
    // do nothing
};

Plugin_Template_Handlebars.prototype.isValidData = function(templateData) {
    if(templateData.indexOf('{{') != -1) {
        return true;
    } else {
        return false
    }
};

Plugin_Template_Handlebars.prototype.isValidFileExtension = function(fileExt) {
    return _.contains(this.validFileExts, fileExt);
};

Plugin_Template_Handlebars.prototype.compile = function(templateData) {
    return handlebars.compile(templateData);
};
