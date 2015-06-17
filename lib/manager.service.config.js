'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _libUtilJs = require('./../lib/util.js');

var _libUtilJs2 = _interopRequireDefault(_libUtilJs);

var logger = null;

var ServiceManagerConfig = (function () {
    // var appName = this._config.appName || this._defaultAppName;

    function ServiceManagerConfig(appName, config) {
        _classCallCheck(this, ServiceManagerConfig);

        this._appName = appName;
        this._config = config;
        if (!this._config) {
            this._config = {};
        }

        logger = _libUtilJs2['default'].logger('ServicesConfig');

        this._normalize();
    }

    _createClass(ServiceManagerConfig, [{
        key: 'get',
        value: function get() {
            return this._config;
        }
    }, {
        key: '_normalize',
        value: function _normalize() {
            // copy to be applied to _config
            var config = this._config;
            if (_lodash2['default'].isArray(config) || _lodash2['default'].isObject(config)) {
                config = _lodash2['default'].cloneDeep(this._config);
            }

            // setup normalized object
            this._config = {
                services: {}
            };

            // if array
            if (_lodash2['default'].isArray(config)) {
                config.forEach(this._normalizeService.bind(this));
            } else if (_lodash2['default'].isObject(config) && config.hasOwnProperty('services')) {
                // has sub services
                _lodash2['default'].forEach(config.services, (function (service, key) {
                    if (!service.hasOwnProperty('name')) {
                        service.name = key;
                    }

                    this._normalizeService(service);
                }).bind(this));
            }
            // if string or object
            else if (_lodash2['default'].isString(config) || _lodash2['default'].isObject(config)) {
                this._normalizeService(config);
            } else {
                logger.error('Invalid config type:', config);
            }

            //logger.log("normalize service config:", JSON.stringify(this._config, null, 2));
        }
    }, {
        key: '_normalizeService',
        value: function _normalizeService(service) {
            var key = this._appName;
            var defaultService = {
                config: {},
                options: {},
                preRoutes: {},
                routes: [],
                directory: { service: 'lib', controllers: '', resolvers: '', views: '', 'static': '' }
            };

            // -----------------------------------------------
            if (_lodash2['default'].isString(service)) {
                key = service;
                service = defaultService;
                //
                service.name = key;
                service.directory.service = key;
            } else if (_lodash2['default'].isObject(service)) {
                if (service.hasOwnProperty('name')) {
                    key = service.name;
                    defaultService.directory.service = service.name;
                } else {
                    service.name = key;
                }

                if (service.hasOwnProperty('directory') && _lodash2['default'].isString(service.directory)) {
                    defaultService.directory.service = service.directory;
                    service.directory = defaultService.directory;
                }

                service = _lodash2['default'].merge(defaultService, service);
            } else {
                logger.warn('Invalid service type:', service);
            }
            // -----------------------------------------------

            // check if service.directories exists
            // find dir for each type
            _lodash2['default'].forEach(service.directory, (function (dir, d) {
                //logger.info("d:", d, ", key:", key, ", directory:", service.directory[d], ", directory.service:", service.directory.service);
                service.directory[d] = this._findDir(d, service.directory[d], key, service.directory.service);
                //logger.info("found directory:", service.directory[d]);

                if (!service.directory[d]) {
                    logger.info('Could not find ' + d + ' dir in App dir (' + process.cwd() + ')');
                    //service.directory[d] = service.name;
                    // if not, set to current working dir
                    service.directory[d] = process.cwd();
                }
            }).bind(this));

            // if config does not contain routes
            // try to load a routes file using app name
            if (!service.hasOwnProperty('routes') || !(_lodash2['default'].isArray(service.routes) && service.routes.length)) {
                try {
                    // use directory as root to look for routes file
                    var fileSearchPath = _path2['default'].resolve(process.cwd(), service.directory.service) + _path2['default'].sep + '**' + _path2['default'].sep + service.name + '.routes.js';
                    //logger.log("fileSearchPath:", fileSearchPath);
                    var globs = _glob2['default'].sync(fileSearchPath);

                    // remove all node_modules
                    globs = _libUtilJs2['default'].filterNodeModules(globs);
                    //logger.log("globs:", globs);

                    if (globs.length == 0) {
                        logger.info('Could not find a routes files and service defined (%s)', fileSearchPath);
                    } else if (globs.length > 1) {
                        logger.warn('More than one route file found', globs);
                    }

                    if (globs.length == 1) {
                        var file = _path2['default'].resolve(globs[0]);
                        service.routes = require(file);
                    }
                } catch (err) {
                    logger.warn('Could not load routes files.', err);
                    return;
                }
            }

            // -----------------------------------------------
            if (this._config.services.hasOwnProperty(key)) {
                logger.warn('Service already in services:', key);
            }

            //logger.log("normalize service:", JSON.stringify(service, null, 2));
            this._config.services[key] = service;
        }
    }, {
        key: '_findDir',

        // directory default: "lib/<service key name in service list>"
        value: function _findDir(type, configDirectory, serviceName, serviceDir) {
            // check if configDir is set, a string and not empty
            if (configDirectory && _lodash2['default'].isString(configDirectory) && configDirectory.length > 0) {
                // add cwd, if need be
                configDirectory = _path2['default'].resolve(configDirectory);
                if (_fs2['default'].existsSync(configDirectory)) {
                    return configDirectory;
                }
            }

            // find it
            var file = '';

            if (type === 'service') {
                // look for service/app file
                file = _path2['default'].sep + 'service.' + serviceName + '.js';
                var globs = _glob2['default'].sync('**' + file);

                // remove all node_modules
                globs = _libUtilJs2['default'].filterNodeModules(globs);

                // check if file exists
                if (globs.length > 0) {
                    if (globs.length > 1) {
                        logger.warn('More than one service file found', globs);
                    }
                    // dirname removes files from results
                    return _path2['default'].dirname(process.cwd() + _path2['default'].sep + globs[0]);
                }

                file = _path2['default'].sep + serviceName + '.js';
                var globs = _glob2['default'].sync('**' + file);
                // remove all node_modules
                globs = _libUtilJs2['default'].filterNodeModules(globs);

                // check if file exists
                if (globs.length > 0) {
                    if (globs.length > 1) {
                        logger.warn('More than one service file found', globs);
                    }
                    // dirname removes files from results
                    return _path2['default'].dirname(process.cwd() + _path2['default'].sep + globs[0]);
                }

                // default "<cwd>/<service.dir>/lib"
                return process.cwd() + _path2['default'].sep + 'lib';
            } else {
                // start in service dir
                var globs = _glob2['default'].sync(serviceDir + _path2['default'].sep + '**' + _path2['default'].sep + type);
                // remove all node_modules
                globs = _libUtilJs2['default'].filterNodeModules(globs);

                // check if file exists
                if (globs.length > 0) {
                    if (globs.length > 1) {
                        logger.warn('More than one service file found', globs);
                    }
                    return globs[0];
                }

                // default "<service.directory>/<type>"
                return serviceDir + _path2['default'].sep + type;
            }
        }
    }]);

    return ServiceManagerConfig;
})();

exports['default'] = ServiceManagerConfig;
module.exports = exports['default'];