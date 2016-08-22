'use strict';

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var path = require('path');
var fs = require('fs');

var _ = require('lodash');
var when = require('when');

var ResourceManager = function () {
  function ResourceManager(serviceManager, service, logger) {
    (0, _classCallCheck3.default)(this, ResourceManager);

    this._serviceManager = serviceManager;
    this._service = service;
    this._L = logger;
    this._resources = {};
  }

  (0, _createClass3.default)(ResourceManager, [{
    key: 'load',
    value: function load(resources) {
      var pList = [];
      var resList = [];

      if (_.isArray(resources)) {
        resList = resources;
      } else if (_.isObject(resources)) {
        // convert objects to array
        _.forEach(resources, function (group, groupName) {
          _.forEach(group, function (res, resName) {
            var resource = {
              group: groupName,
              name: resName,
              type: res.type || 'factory',
              module: res.module
            };
            resList.push(resource);
          });
        });
      } else {
        return when.reject('Invalid resouce type');
      }

      // resource array now added
      _.forEach(resList, function (resource) {
        var p = this.add(resource);
        pList.push(p);
      }.bind(this));

      return when.all(pList);
    }
  }, {
    key: 'postStartInit',
    value: function postStartInit() {
      var pList = [];

      _.forEach(this._resources, function (resource) {
        if (resource.instance && _.isFunction(resource.instance.$postStartInit)) {
          try {
            var result = this._serviceManager.injectionDependency(module, this._service, resource.instance, resource.instance.$postStartInit);
            // is promise
            if (_.isObject(result) && _.isFunction(result.then)) {
              pList.push(result);
            }
          } catch (err) {
            this._L.error('Post Start Init Service Error:', err);
            return when.reject(err);
          }
        }
      }.bind(this));

      return when.all(pList);
    }
  }, {
    key: 'getAllModules',
    value: function getAllModules() {
      var list = {};
      _.forEach(this._resources, function (resource, name) {
        list[name] = resource.module;
      });
      return list;
    }
  }, {
    key: 'getAllInstances',
    value: function getAllInstances() {
      var list = {};
      _.forEach(this._resources, function (resource, name) {
        list[name] = resource.instance;
      });
      return list;
    }
  }, {
    key: 'add',
    value: function add(name, resourceModule) {
      var type = arguments.length <= 2 || arguments[2] === undefined ? 'factory' : arguments[2];
      var group = arguments.length <= 3 || arguments[3] === undefined ? 'default' : arguments[3];

      if (_.isObject(name)) {
        var resObj = name;
        resourceModule = resObj.module;
        type = resObj.type;
        group = resObj.group;
        name = resObj.name;
      }

      var resourceInstance = resourceModule;
      var promise = null;

      if (!type) {
        type = 'factory';
      }

      if (!_.isString(name)) {
        this._L.error("argument1 ('name') needs to be a string");
      }

      if (!resourceModule) {
        resourceModule = name;
      }

      this._L.log('Adding Resource "%s"', name);

      // if string try to load file
      if (_.isString(resourceModule)) {
        // load resource from file
        resourceModule = this._loadResourceFile(name, resourceModule);
      }

      if (type === 'factory') {
        if (_.isFunction(resourceModule)) {
          var _module = {};
          var InjectedModule = this._serviceManager.injectionDependency(_module, this._service, {
            module: resourceModule
          });
          resourceInstance = new InjectedModule();

          // run $init function
          if (_.isFunction(resourceInstance.$init)) {
            try {
              var result = this._serviceManager.injectionDependency(_module, this._service, resourceInstance, resourceInstance.$init);

              // is promise
              if (_.isObject(result) && _.isFunction(result.then)) {
                promise = result.then(function () {
                  return resourceInstance;
                });
              }
            } catch (err) {
              this._L.error('Loading Middleware Error:', err);
              return when.resolve(null);
            }
          }
        } else {
          this._L.error("argument2 ('resource') needs to be a function/module");
        }
      }

      if (_.isObject(resourceModule)) {
        this._resources[name] = {
          module: resourceModule,
          instance: resourceInstance
        };
      } else {
        this._L.info("Could not find or load resource '%s'", name);
      }

      if (!promise) {
        promise = when.resolve(resourceInstance);
      }

      // to support the adding resouce on service constructor
      if (this._serviceManager.isLoading()) {
        this._serviceManager.addToLoadingQ(this._service, promise);
      }

      return promise;
    }
  }, {
    key: '_loadResourceFile',
    value: function _loadResourceFile(name, file) {
      var tmpFile = path.join(process.cwd(), file);
      if (fs.existsSync(tmpFile)) {
        try {
          return require(tmpFile);
        } catch (err) {
          // not needed
        }
      }

      // TODO: is this needed? could be removed
      // mod = this._loadFile(type, name, file);
      // if (mod) {
      //     return mod;
      // }
      // mod = this._loadFile(type, name, '.');
      // if (mod) {
      //     return mod;
      // }
      // for (var key in this._services) {
      //     mod = this._loadFile(type, name, this._services[key].directory.service);
      //     if (mod) {
      //         return mod;
      //     }
      // }

      return null;
    }
  }]);
  return ResourceManager;
}();

module.exports = ResourceManager;