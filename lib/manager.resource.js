'use strict';

let path = require('path');
let fs   = require('fs');

let _    = require('lodash');
let when = require('when');

class ResourceManager {
  constructor (serviceManager, service, logger) {
    this._serviceManager = serviceManager;
    this._service = service;
    this._L = logger;
    this._resources = {};
  }

  load (resources) {
    var pList = [];
    var resList = [];

    if (_.isArray(resources)) {
      resList = resources;
    }
    else if (_.isObject(resources)) {
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

          let resource = {
            group:  groupName,
            name:   resName,
            type:   res.type || 'factory',
            module: res.module
          };
          resList.push(resource);
        });
      });
    }
    else {
      this._L.error('Invalid resouce type');
    }

    // resource array now added
    _.forEach(resList, function (resource) {
      let p = this.add(resource);
      pList.push(p);
    }.bind(this));

    return when.all(pList);
  }

  postStartInit () {
    var pList = [];

    _.forEach(this._resources, function (resource) {
      if (resource.instance && _.isFunction(resource.instance.$postStartInit)) {
        try {
          var result = this._serviceManager.injectionDependency(module, this._service, resource.instance, resource.instance.$postStartInit);
          // is promise
          if (_.isObject(result) && _.isFunction(result.then)) {
            pList.push(result);
          }
        }
        catch (err) {
          this._L.error('Post Start Init Service Error:', err);
          return when.reject(err);
        }
      }
    }.bind(this));

    return when.all(pList);
  }

  newModule (group, resName) {
    let resInstance = null;
    let resource = this._find(group, resName);
    if (resource && resource.module) {
      var Module = resource.module;
      resInstance = new Module();
      resource.instance = resInstance;
    }
    return resInstance;
  }

  $init (group, resName) {
    return this._diExec(group, resName, '$init');
  }

  $postStartInit (group, resName) {
    return this._diExec(group, resName, '$postStartInit');
  }

  getAllModules (group) {
    var list = {};
    _.forEach(this._resources, function (resource, name) {
      if (!group || (group && group === resource.group)) {
        list[name] = resource.module;
      }
    });
    return list;
  }

  getAllInstances (group) {
    var list = {};
    _.forEach(this._resources, function (resource, name) {
      if (!group || (group && group === resource.group)) {
        list[name] = resource.instance;
      }
    });
    return list;
  }

  /*
  * get resource instance by name
  * @return resource instance
  */
  get (resName) {
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
  add (name, resourceModule, type = 'factory', group = 'default', returnPromise = false) {
    if (!type) {
      type = 'factory';
    }
    if (!group) {
      group = 'default';
    }

    if (_.isObject(name)) {
      let resObj = name;
      resourceModule = resObj.module;
      name = resObj.name;
      type = resObj.type || type;
      group = resObj.group || group;
    }

    let resourceInstance = resourceModule;
    let promise = null;

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
        let module = {};
        let InjectedModule = this._serviceManager.injectionDependency(module, this._service, {
          module: resourceModule
        });
        resourceInstance = new InjectedModule();
      }
      else {
        this._L.error("argument2 ('resource') needs to be a function/module");
      }
    }

    if (_.isObject(resourceModule)) {
      this._resources[name] = {
        group:    group,
        type:     type,
        module:   resourceModule,
        instance: resourceInstance
      };
    }
    else {
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
    }
    else {
      return resourceInstance;
    }
  }

  /*
  * @return promise
  */
  addWithInit (name, resourceModule, type = 'factory', group = 'default') {
    return this.add(name, resourceModule, type, group, true);
  }

  _diExec (group, resName, funcName) {
    let promise = when.resolve();
    let resource = this._find(group, resName);

    if (resource &&
        resource.instance &&
        _.isFunction(resource.instance[funcName])
    ) {
      try {
        let result = this._serviceManager.injectionDependency(module, this._service, resource.instance, resource.instance[funcName]);

        // is promise
        if (_.isObject(result) && _.isFunction(result.then)) {
          promise = result.then(function () {
            return resource.instance;
          });
        }
      }
      catch (err) {
        this._L.error('Loading Middleware Error:', err);
        promise = when.reject(err);
      }
    }

    if (!promise) {
      promise = when.resolve();
    }

    return promise;
  }

  _find (group, resName) {
    let res = null;
    _.forEach(this._resources, function (resource, name) {
      if (group &&
          (group === resource.group) &&
          (resName === name)
      ) {
        res = resource;
        return false;
      }
    });
    return res;
  }

  _loadResourceFile (name, file) {
    let tmpFile = path.join(process.cwd(), file);
    if (fs.existsSync(tmpFile)) {
      try {
        return require(tmpFile);
      }
      catch (err) {
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
}

module.exports = ResourceManager;
