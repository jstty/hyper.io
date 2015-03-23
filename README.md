hyper.io
=====

This project is in early alpha stage, wait until 1.0.0 for production use.

## Features
* Auto Service Discovery
* Encourage Modular based design
    * Services
    * Controllers
    * Resolvers
    * Resources
* Modern
    * DI
    * **Streams**
    * **Promises**
* Production Ready
    * Session Management
    * SSL Support
    * Configuration Management
    * Logging Management
    * Secure
    * **Stats Collection**
    * **Throttling/Service Protection**
    * **Input Validation**
    * **API Doc Generation**
* Middleware Plugins
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

Note: **Bolded items** are on the roadmap, not in the current release.

## Current Release
* 0.2.0 - Release
    * Add Resolvers
    * Add middleware system
        * Add required option to route
        * Add basic auth middleware

## Next Release
* 0.3.0 - Release
    * [x] Add Resource type
        * [x] Resource Examples
            * [x] Basic
            * [x] SQLite
    * [x] Add Multi Service Example
        * [x] Single File
        * [x] Multi File
    * [x] Add Basic Auth Example
    * [x] Add Config Examples
    * [ ] Add Advanced Auth middleware
        * [ ] Passport
        * [ ] Example

## Road Map
* 0.4.0 - Release
    * Tests
        * Services
        * Controllers
        * Routes
        * Resolvers
        * Require
        * Config
    * General route pipeline
    * Replace Middleware with yanpm plugin manager
    * Move Express out of the framework to its own plugin (hyper.io-express)
    * Move Hapi out of the framework to its own plugin (hyper.io-hapi)

* 0.5.0 - Release
    * Polish and bug fixes
    * API documentation
    * Plugin manager support private NPM repos
    * Input Examples
        * POST - $input.body
        * GET  - $input.query
        * GET  - $input.hash
        * GET  - $input.params

---
* 0.6.0 - Release
    * Refactor Service Manager - breaking it into smaller modules
    * Input validation
        * Express
            * https://github.com/ctavan/express-validator
            * https://github.com/petreboy14/express-joi
    * Support External Session Stores
        * Redis
            * https://github.com/tj/connect-redis

* 0.7.0 - Release
    * Route Throttling
        * Express
            * https://github.com/ivolo/express-rate
    * Add CLI
        * Keep Alive
            * Forever - https://github.com/foreverjs/forever
            * PM2 - https://github.com/Unitech/pm2
    
* 0.8.0 - Release
    * API Doc generation
        * Express
            * https://github.com/fliptoo/swagger-express
    * CLI
        * Add API Doc generation

* 0.9.0 - Release
    * CLI
        * Create Route for a Controller
        * Create Basic Server with Service
        * Build/Package/Deploy
    * Support Clustering

---
* 1.0.0 - Release
    * Load tests
    * Benchmarking Tools
    * Polish and bug fixes
    * More Documentation
        * How To 
            * Server production setup
        * Update API

## Example
See [Examples](https://github.com/jstty/hyper.io/tree/master/examples) directory


## API

### Functions Dependency Injection
* $rawRequest: route request
* $rawResponse: route response
* $next: route next function
* $done: route done function
* $error: route error function
* $fatal: route fatal function
* $session: req.session
* $cookies: req.cookies
* $input
    * $input.body: POST data
    * $input.hash: GET hash data
    * $input.query: GET query data
    * $input.params: GET query data

