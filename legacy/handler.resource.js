'use strict';

/**
 * Handler for Resources, used in Service/Controllers
 *
 */

module.exports = ResourceHandler;

/* ---------------------------------------------------
 * Constructor
 * --------------------------------------------------- */
function ResourceHandler(ServiceManager, service) {
  this._ServiceManager = ServiceManager;
  this._service = service;
}

/* ---------------------------------------------------
 * Public Functions
 * --------------------------------------------------- */
ResourceHandler.prototype.add = function (name, resourceModule, type) {
  return this._ServiceManager.addResource(name, resourceModule, type, this._service);
};

// ResourceHandler.prototype.getAllModules = function(name, resourceModule, type) {
// TODO: do I neede this?
// };

ResourceHandler.prototype.createInstance = function (group, name, resourceModule, type) {};