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
      return when.reject('Invalid resouce type');
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

  getAllModules () {
    var list = {};
    _.forEach(this._resources, function (resource, name) {
      list[name] = resource.module;
    });
    return list;
  }

  getAllInstances () {
    var list = {};
    _.forEach(this._resources, function (resource, name) {
      list[name] = resource.instance;
    });
    return list;
  }

  add (name, resourceModule, type = 'factory', group = 'default') {
    if (_.isObject(name)) {
      let resObj = name;
      resourceModule = resObj.module;
      type = resObj.type;
      group = resObj.group;
      name = resObj.name;
    }

    let resourceInstance = resourceModule;
    let promise = null;

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
        let module = {};
        let InjectedModule = this._serviceManager.injectionDependency(module, this._service, {
          module: resourceModule
        });
        resourceInstance = new InjectedModule();

        // run $init function
        if (_.isFunction(resourceInstance.$init)) {
          try {
            let result = this._serviceManager.injectionDependency(module, this._service, resourceInstance, resourceInstance.$init);

            // is promise
            if (_.isObject(result) && _.isFunction(result.then)) {
              promise = result.then(function () {
                return resourceInstance;
              });
            }
          }
          catch (err) {
            this._L.error('Loading Middleware Error:', err);
            return when.resolve(null);
          }
        }
      }
      else {
        this._L.error("argument2 ('resource') needs to be a function/module");
      }
    }

    if (_.isObject(resourceModule)) {
      this._resources[name] = {
        module:   resourceModule,
        instance: resourceInstance
      };
    }
    else {
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
