hyper
=====

## Features
* Order out of Chaos
    * Encourage Modular based design
        * Services
        * Controllers
        * Resolvers
        * Resources
* Modern design
    * DI
    * Promise based
* Production Ready
    * Stats collection
    * Route Throttling
    * Input validation
    * API Doc generation
    * Configuration management
    * Logging management
    * Data-store service
    * optional service base architecture
* Middleware
    * Framework
        * Configuration management (default: transfuser)
        * Logging (default: stumpy)
        * Monitor Server Stats (default: statsd)
    * Template Engines
    * Authentication
        * basic auth
        * SSO (via passport)

### -----------------
## TODO
* 0.2.0 - Release
    * [x] Add Resolvers
    * [/] Add middleware system
        * [/] Add required option to route
        * [/] Add basic auth middleware

* 0.3.0 - Release
    * Add Resource plugins
        * MongoDB
        * MySQL
        * Twitter
    * Add additional functions to Middleware
        * pre/post route processing
        * framework

* 0.4.0 - Release
    * Add SSO (passport) auth middleware

* 0.5.0 - Release
    * Polish and bug fixes
    * Write better README

### -----------------
* 0.6.0 - Release
    * Input validation
       * Express
            * https://github.com/ctavan/express-validator
            * https://github.com/petreboy14/express-joi

* 0.7.0 - Release
    * Route Throttling
        * Express
            * https://github.com/ivolo/express-rate

* 0.8.0 - Release
    * API Doc generation
        * Express
            * https://github.com/fliptoo/swagger-express

* 0.9.0 - Release
    * Add Dependency injection to remaining Functions

* 1.0.0 - Release
    * Add Hapi Framework
        * Sessions
        * Cookies
        * Input validation
            * https://github.com/hapijs/joi
        * Route Throttling
            * https://github.com/glaubinix/hapi-api-rate-limit
        * API Doc generation
            * https://github.com/glennjones/hapi-swagger
