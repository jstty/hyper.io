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
            if (_.isString(res)) {
              // TODO: load all modules in the dir
              this._L.error('Invalid resouce type');
            }
            // is module not object containing module properties
            else if (_.isObject(res) && !res.hasOwnProperty('module')) {
                var module = res;
                res = {
                  module: module
                };
              }

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
        this._L.error('Invalid resouce type');
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
    key: 'newModule',
    value: function newModule(group, resName) {
      var resInstance = null;
      var resource = this._find(group, resName);
      if (resource && resource.module) {
        var Module = resource.module;
        resInstance = new Module();
        resource.instance = resInstance;
      }
      return resInstance;
    }
  }, {
    key: '$init',
    value: function $init(group, resName) {
      return this._diExec(group, resName, '$init');
    }
  }, {
    key: '$postStartInit',
    value: function $postStartInit(group, resName) {
      return this._diExec(group, resName, '$postStartInit');
    }
  }, {
    key: 'getAllModules',
    value: function getAllModules(group) {
      var list = {};
      _.forEach(this._resources, function (resource, name) {
        if (!group || group && group === resource.group) {
          list[name] = resource.module;
        }
      });
      return list;
    }
  }, {
    key: 'getAllInstances',
    value: function getAllInstances(group) {
      var list = {};
      _.forEach(this._resources, function (resource, name) {
        if (!group || group && group === resource.group) {
          list[name] = resource.instance;
        }
      });
      return list;
    }

    /*
    * get resource instance by name
    * @return resource instance
    */

  }, {
    key: 'get',
    value: function get(resName) {
      var resInst;
      _.forEach(this._resources, function (resource, name) {
        if (name === resName) {
          resInst = resource.instance;
          // shortcut exit
          return false;
        }
      });
      return resInst;
    }

    /*
    * @return resource instance
    */

  }, {
    key: 'add',
    value: function add(name, resourceModule) {
      var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'factory';
      var group = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'default';
      var returnPromise = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      if (!type) {
        type = 'factory';
      }
      if (!group) {
        group = 'default';
      }

      if (_.isObject(name)) {
        var resObj = name;
        resourceModule = resObj.module;
        name = resObj.name;
        type = resObj.type || type;
        group = resObj.group || group;
      }

      var resourceInstance = resourceModule;
      var promise = null;

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
        } else {
          this._L.error("argument2 ('resource') needs to be a function/module");
        }
      }

      if (_.isObject(resourceModule)) {
        this._resources[name] = {
          group: group,
          type: type,
          module: resourceModule,
          instance: resourceInstance
        };
      } else {
        this._L.info("Could not find or load resource '%s'", name);
      }

      // to support the adding resouce on service constructor
      if (this._serviceManager.isLoading()) {
        // if resourceInstance then run $init function
        if (resourceInstance !== resourceModule) {
          promise = this.$init(group, name);
        }

        if (!promise) {
          promise = when.resolve(resourceInstance);
        }

        this._serviceManager.addToLoadingQ(this._service, promise);
      }

      if (returnPromise) {
        if (!promise) {
          promise = when.resolve(resourceInstance);
        }
        return promise;
      } else {
        return resourceInstance;
      }
    }

    /*
    * @return promise
    */

  }, {
    key: 'addWithInit',
    value: function addWithInit(name, resourceModule) {
      var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'factory';
      var group = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'default';

      return this.add(name, resourceModule, type, group, true);
    }
  }, {
    key: '_diExec',
    value: function _diExec(group, resName, funcName) {
      var promise = when.resolve();
      var resource = this._find(group, resName);

      if (resource && resource.instance && _.isFunction(resource.instance[funcName])) {
        try {
          var result = this._serviceManager.injectionDependency(module, this._service, resource.instance, resource.instance[funcName]);

          // is promise
          if (_.isObject(result) && _.isFunction(result.then)) {
            promise = result.then(function () {
              return resource.instance;
            });
          }
        } catch (err) {
          this._L.error('Loading Middleware Error:', err);
          promise = when.reject(err);
        }
      }

      if (!promise) {
        promise = when.resolve();
      }

      return promise;
    }
  }, {
    key: '_find',
    value: function _find(group, resName) {
      var res = null;
      _.forEach(this._resources, function (resource, name) {
        if (group && group === resource.group && resName === name) {
          res = resource;
          return false;
        }
      });
      return res;
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