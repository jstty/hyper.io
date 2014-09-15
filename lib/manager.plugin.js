'use strict';

/**
 * Manager for Plugins
 *
 */
var fs         = require('fs');
var path       = require('path');
//
var _          = require('lodash');
//
var util       = require('./util.js');

var logger = null;

module.exports = PluginManager;

/* ---------------------------------------------------
 * Consructor
 * --------------------------------------------------- */
function PluginManager(config){
    this._config = _.merge({
        // defaults
        service:   {directory:''},
        framework: {directory:''}
    }, config);

    logger = util.getLogger('PluginManager');

    this.plugins = {
    };

    this.defaultPlugins = {
    };
}

/* ---------------------------------------------------
 * Public Functions
 * --------------------------------------------------- */
/*
 plugin.use('template', 'ejs');
 plugin.use('template', 'handlebars', 'default'); // set default

 plugin.use('template', {
    name: 'ejs',
    file: './lib/plugins/ejs.js'
 });

 plugin.use('template', require('./lib/plugins/ejs.js'));
 */
PluginManager.prototype.use = function(pluginGroup, pluginName, option) {
    if( _.isString(option) &&
        option === 'default') {

        // check if already default
        var defaultPlugin = this._getDefault(pluginGroup);

        // if default plugin not exist then set it
        // OR
        // not name the same
        if( !defaultPlugin ||
            ( defaultPlugin && defaultPlugin.name != pluginName) ) {
            defaultPlugin = this._setDefault(pluginGroup, pluginName);
            // default was added
            if(defaultPlugin) {
                return defaultPlugin.plugin;
            } else {
                // problem with plugin
                // error already reported upstream
            }
        }
    }

    var plugin = this._getPlugin(pluginGroup, pluginName);
    // if plugin not exist then set it
    if(!plugin) {
        if(_.isFunction(pluginName)) {
            plugin = this._setPlugin(pluginGroup, pluginName);
        }
        else if( _.isObject(pluginName) &&
                 pluginName.hasOwnProperty('name') &&
                 pluginName.hasOwnProperty('file') ) {
            // find plugin file, load it
            plugin = this._loadPluginFile(pluginGroup, pluginName.name, pluginName.file);
        }
        else if(_.isString(pluginName)) {
            // find plugin file, load it
            plugin = this._loadPluginFile(pluginGroup, pluginName, pluginName);
        } else {
            logger.warn("Plugin ("+pluginGroup+", "+pluginName+") invalid");
        }
    }

    return plugin;
};

PluginManager.prototype.get = function(pluginGroup, pluginName) {
    return this._getPlugin(pluginGroup, pluginName);
};

PluginManager.prototype.getAll = function(pluginGroup) {
    if( this.plugins.hasOwnProperty(pluginGroup) ) {
        return this.plugins[pluginGroup];
    }
    return null;
};

PluginManager.prototype.getDefault = function(pluginGroup) {
    if( this.defaultPlugins.hasOwnProperty(pluginGroup) ) {
        return this.defaultPlugins[pluginGroup];
    }
    return null;
};

/* ---------------------------------------------------
 * Private Functions
 * --------------------------------------------------- */
PluginManager.prototype._loadPluginFile = function(pluginGroup, pluginName, pluginFileName) {

    var pluginClass = null;
    var file = pluginFileName;

    // try loading file as path
    if(fs.existsSync(file)) {
        pluginClass = require(file);
    }

    if(!pluginClass) {
        // try loading from framework dir
        // <hyper root>/lib/plugins/<plugin group>.<plugin name>.js
        // Example: ./lib/plugins/template.handlebars.js
        file = path.normalize(this._config.framework.directory + path.sep + "plugins" + path.sep + pluginGroup + '.' + pluginName + ".js");
        if (fs.existsSync(file)) {
            pluginClass = require(file);
        }
    }

    if(!pluginClass) {
        // try loading from service dir
        // <service root>/plugins/<plugin file name>.js
        // Example: ./lib/plugins/handlebars.js
        file = path.normalize(this._config.service.directory + path.sep + "plugins" + path.sep + pluginFileName + ".js");
        if(fs.existsSync(file)) {
            pluginClass = require(file);
        }
    }

    if(pluginClass) {
        return this._setPlugin(pluginGroup, pluginName, pluginClass);
    }

    // error
    logger.warn("Could not load plugin ("+pluginGroup+", "+pluginName+"):", pluginFileName);
    return null;
};

PluginManager.prototype._getPlugin = function(pluginGroup, pluginName) {
    if( this.plugins.hasOwnProperty(pluginGroup) &&
        this.plugins[pluginGroup].hasOwnProperty(pluginName) ) {
        return this.plugins[pluginGroup][pluginName];
    }
    return null;
};

PluginManager.prototype._setPlugin = function(pluginGroup, pluginName, pluginClass) {
    if( !_.isObject(this.plugins[pluginGroup]) ) {
        this.plugins[pluginGroup] = {};
    }

    if( !_.isObject(this.plugins[pluginGroup][pluginName]) ) {
        // create plugin
        this.plugins[pluginGroup][pluginName] = new pluginClass();

        // run init function
        if(_.isFunction(this.plugins[pluginGroup][pluginName].init)) {
            this.plugins[pluginGroup][pluginName].init();
        }

        // set it as default
        this._setDefault(pluginGroup, pluginName);
    }

    return this.plugins[pluginGroup][pluginName];
};

PluginManager.prototype._getDefault = function(pluginGroup) {
    if( this.defaultPlugins.hasOwnProperty(pluginGroup) ) {
        return this.defaultPlugins[pluginGroup];
    }
    return null;
};

PluginManager.prototype._setDefault = function(pluginGroup, pluginName) {
    var plugin = this._getPlugin(pluginGroup, pluginName);

    if(plugin) {
        if( !_.isObject(this.defaultPlugins[pluginGroup]) ) {
            this.defaultPlugins[pluginGroup] = {
                name: null,
                plugin: null
            };
        }

        // set default
        this.defaultPlugins[pluginGroup].name = pluginName;
        this.defaultPlugins[pluginGroup].plugin = plugin;

        return this.defaultPlugins[pluginGroup];
    } else {
        // if plugin not exist then try to load it
        plugin = this.plugin(pluginGroup, pluginName);
        // if plugin created, set it to default, as intended
        if(plugin) {
            return this._setDefault(pluginGroup, pluginName);
        }
    }

    return null;
};

