<!-- # hyper.io - go plaid -->
<center>![logo](./logo.png)</center>

[![Build Status](https://secure.travis-ci.org/jstty/hyper.io.png?branch=master)](http://travis-ci.org/jstty/hyper.io)
[![bitHound Score](https://www.bithound.io/github/jstty/hyper.io/badges/score.svg?branch=master)](https://www.bithound.io/github/jstty/hyper.io)
[![Coverage Status](https://coveralls.io/repos/jstty/hyper.io/badge.svg?branch=master&service=github)](https://coveralls.io/github/jstty/hyper.io?branch=master)
![License](https://img.shields.io/npm/l/hyper.io.svg)
[![Dependency Status](https://david-dm.org/jstty/hyper.io.png?theme=shields.io&branch=master)](https://david-dm.org/jstty/hyper.io)
[![devDependency Status](https://david-dm.org/jstty/hyper.io/dev-status.png?theme=shields.io&branch=master)](https://david-dm.org/jstty/hyper.io#info=devDependencies)
 
[![NPM](https://nodei.co/npm/hyper.io.png)](https://nodei.co/npm/hyper.io/)


## Features
* Auto Service Discovery
* Encourage Modular based design
    * Services
    * Controllers
    * Resolvers
    * Resources
    * Factories
    * Adapters
* Modern
    * DI
    * Promises
    * **Streams**
* Production Ready
    * Session Management
    * **SSL Support**
    * Configuration Management
    * Logging Management
    * **Secure**
    * **Stats Collection**
    * **Throttling/Service Protection**
    * **Input Validation**
    * **API Doc Generation**
    * **Load tests**
    * **Benchmarking Tools**
* Middleware Plugins
    * Plugin manager (yanpm)
    * Configuration management (default: transfuser)
    * Logging (default: stumpy)
    * Template Engines (default: ejs)
    * **Monitor Server Stats (default: statsd)**
    * Authentication
        * basic auth
        * **SSO (default: passport)**
* CLI
   * **Keep Alive** (default: forever)
   * **Scaffolding Generator**
   * **Build/Package/Deploy**
   * **Load tests**
   * **Benchmarking Tools**

Note: **Bold items** are on the roadmap, not in the current release.

## Example
See [Examples](./examples) directory


## API
### Config Loading/Merge Order
1. Built in [config](./lib/config.js)
2. Current working directory (most likely, dir server was run in)
    * config.json
    * config.js
    * <app/project name>.config.json
    * <app/project name>.config.js
3. User home directory
    * config.custom.json
    * config.custom.js
    * <app/project name>.config.custom.json
    * <app/project name>.config.custom.json


### Functions Dependency Injection
* $hyper: instance of the current hyper server
* $q: promise library used in hyper (default: when)
* _: util library used in hyper (default: lodash)
* $logger: logger library used in hyper (default: stumpy)
* $rawRequest: raw route request from httpFramework
* $rawResponse: raw route response from httpFramework
* $next: route next function
* $done: route done function
* $error: route error function
* $fatal: route fatal function
* $session: req.session
* $cookies: req.cookies
* $input
    * $input.body: POST data
    * $input.query: GET query data
    * $input.params: GET query data


### Releases
## **Current Release**
* 0.5.0 - Release
    * Replace Middleware with yanpm plugin manager
    * Refactor Service Manager - breaking it into smaller modules
    * Custom binary responses
    * Examples:
        * Auth middleware - Basic

## Next Release
* 0.6.0 - Polish
    * Examples:
        * [ ] Auth middleware
            * [ ] JWT
            * [ ] Passport
    * [ ] Error checks (bullet proof)
    * [ ] Polish and bug fixes
    * [ ] API documentation


## Road Map
---
* 1.0.0 - Release
    * [ ] Add $di DI attribute to inject dependencies into a function
    * [ ] Move Express out of the framework to its own plugin (hyper.io-express)
    * [ ] General route pipeline
    * [ ] Input validation
        * Express
            * https://github.com/ctavan/express-validator
            * https://github.com/petreboy14/express-joi

* 1.2.0 - Release
    * add Koa support
    * Plugin manager support private NPM repos
    * Move Service router adapter to plugins and use external repos
    * Unit Tests
    * Route Throttling
        * Express
            * https://github.com/ivolo/express-rate
    * Add CLI
        * Keep Alive
            * Forever - https://github.com/foreverjs/forever
            * PM2 - https://github.com/Unitech/pm2
    
* 1.4.0 - Release
    * API Doc generation
        * Express
            * https://github.com/fliptoo/swagger-express
    * CLI
        * Add API Doc generation

* 1.6.0 - Release
    * CLI
        * Create Route for a Controller
        * Create Basic Server with Service
        * Build/Package/Deploy
    * Support Clustering

---
* 2.0.0 - Release
    * Load tests
    * Benchmarking Tools
    * Polish and bug fixes
    * More Documentation
        * How To 
            * Server production setup
        * Update API
    * Push to Service Store


### Prev Release(s)
* 0.2.0 - Release
    * Add Resolvers
    * Add middleware system
        * Add required option to route
        * Add basic auth middleware

* 0.3.0 - Release
    * Add Resource type
        * Resource Examples
            * Basic
            * SQLite
        * Add Resource per Service
    * Add Multi Service Example
        * Single File
        * Multi File
    * Add Basic Auth Example
    * Add Config Examples
    * Add DI to Services and Controllers Constructors
    * API Tests
        * Routes
        * Controllers
        * Services
        * Resolvers
        * Resources
        * Custom paths

* 0.4.0 - Release
    * Update Dependencies
    * Add Service Router
        * Add HTTP Adapter
    * Add $services DI
        * .find(&lt;service name&gt;)
        * .get(&lt;route&gt;, [&lt;query/hash data [URL format](https://nodejs.org/docs/latest/api/url.html#url_url)&gt;])
    * Add tests for all examples
    * Add auto-exec $init function waiting on return promise
    * Examples
        * External Services
        * Sessions
        * Input

## License

[MIT licence information](LICENSE).


