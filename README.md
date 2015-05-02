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
    * Factories
* Modern
    * DI
    * Promises
    * **Streams**
* Production Ready
    * **Session Management**
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

Note: **Bolded items** are on the roadmap, not in the current release.

### Releases
## **Current Release**
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

## Next Release
* 0.4.0 - Release
    * [ ] General route pipeline
    * [ ] Replace Middleware with yanpm plugin manager
    * [ ] Move Express out of the framework to its own plugin (hyper.io-express)
    * [ ] Add session store plugin
    * [ ] Examples
        * [ ] Session Store
        * [ ] Auth middleware
            * [ ] Basic
            * [ ] JWT
            * [ ] Passport
        * [ ] Input
            * POST - $input.body
            * GET  - $input.query
            * GET  - $input.hash
            * GET  - $input.params
    * [ ] Add $di DI attribute to inject dependencies into a function
    * [ ] Add Factory, Singleton type

## Road Map
* 0.5.0 - Release
    * [ ] Plugin manager support private NPM repos
    * [ ] Add $services DI
        [ ] .forward(&lt;service name&gt;, &lt;method&gt;, &lt;route&gt;, [&lt;options&gt;])
        [ ] .get(&lt;service name&gt;, [&lt;controller name&gt;])
    * [ ] Unit Tests
        * [ ] Services
        * [ ] Controllers
        * [ ] Routes
        * [ ] Resolvers
        * [ ] Requires
        * [ ] Configs
        * [ ] Factories
        * [ ] Singletons
    * [ ] Error checks (bullet proof)
    * [ ] Polish and bug fixes
    * [ ] API documentation

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


## General Pipeline

* API:
    * [required (middleware)] -> [input validator] -> [pre (middleware)] -> [resolve] -> controller method -> [post (middleware)] -> OUT (json)
* View:
    * [required (middleware)] -> [input validator] -> [pre (middleware)] -> [resolve] -> controller method -> [post (middleware)] -> template (middleware) -> OUT (html)

```json
{
    pipeline: {
        00: "router",
        09: "inputValidator",
        19: "resolver",
        20: {
            module: "passport", // default load require("hyper.io-"+ module name)
            config: {
                strategy: "basic",
                session: false, // if basic, default: false
                options: {}, // default: {}
                users: [ // only for "basic" strategy
                    { username: 'hello', password: 'world' }
                ]
                message: 'Login with user:"hello" pass:"world"'
                // if basic, responseHandler is added to provide basic users DB check
            }
        },
        21: {
            module: require("hyper.io-passport"),
            config: {
                strategy: "google",
                session: true,  // if !basic, default: true
                options: {
                    realm: "http://localhost:3000/", // default to current server
                    returnURL: "http://localhost:3000/", // default realm + route.callback
                },
                responseHandler: function(identifier, profile, done) {
                    // asynchronous verification, for effect...
                    process.nextTick(function () {
                        profile.identifier = identifier;
                        return done(null, profile);
                    });
                },
                routes: {
                    logout: "/logout",      // default /logout
                    auth: "/auth/google",   // default /auth/ + strategy name
                    callback: "/auth/google/return" // default /auth/ + strategy name + /return
                }
            }
        },
        22: {
            module: require("hyper.io-passport"),
            config: {
                strategy: "local",
                responseHandler: function(username, password, done) {
                   User.findOne({ username: username }, function(err, user) {
                     if (err) { return done(err); }
                     if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
                     user.comparePassword(password, function(err, isMatch) {
                       if (err) return done(err);
                       if(isMatch) {
                         return done(null, user);
                       } else {
                         return done(null, false, { message: 'Invalid password' });
                       }
                     });
                   });
                 },
                serializeUser: function(user, done) {
                   done(null, user.id);
               },
               deserializeUser: function(id, done) {
                   User.findById(id, function (err, user) {
                       done(err, user);
                   });
               }
            }
        },
        97: "error",
        98: "api",
        99: "view"
    },
    routes: [
        {
            api: "/hello",
            authBasicRequired: true,
            method: {
                get: function world($done)
                {
                    $done( { hello: "world1" } );
                }
            }
        },
        {
            api: "/world",
            authSSORequired: true,
            method: {
                get: function world($done)
                {
                    $done( { hello: "world2" } );
                }
            }
        }
    ]
}
```

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
    * $input.hash: GET hash data
    * $input.query: GET query data
    * $input.params: GET query data


### Prev Release(s)
* 0.2.0 - Release
    * Add Resolvers
    * Add middleware system
        * Add required option to route
        * Add basic auth middleware

