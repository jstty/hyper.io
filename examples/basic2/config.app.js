
// Main Service
var mainService = {
    directory: "app/main", // default "lib/<service key name in service list>"
    description: "Main Service",
    module: require('./app/main/service.main.js'), // default "./<directory>/service.<name>.js"
    options: {
        keyboard: "cat"
    },
    routes: [
        {
            api: "/hello",
            resolve: {
                //testResolver: testResolver
                //authResolver: authResolver
            },
            controller: "user", // default "<service.directory>/controllers/<controller>.js"
            method: {
                get: "info" // defined in controller module"
            }
        },
        /*
        // [resolver] -> [input validator] -> controller method -> OUT (json)
        {
            api: "/api/user/info",
            resolve: {
                //testResolver: testResolver
                //authResolver: authResolver
            },
            controller: "user", // default "<service.directory>/controllers/<controller>.js"
            method: {
                get: "info" // defined in controller module"
            }
        },
        {
            api: "/api/test1",
            controller: "test",
            method: {
                post: "test"
            }
        },
        //  [resolver] -> [input validator] -> controller method -> template -> OUT (html)
        {
            view:     "/view/auth/login",
            template: "auth.ejs", // required, default "<service.directory>/views/<template>"
            outContentType: "text/html",
            resolve: {
                //authResolver: authResolver
            },
            controller: "auth",
            method: {
                get: "login"
            }
        },
        {
            view: "/view/test1",
            template:   "test1.ejs",
            controller: "test",
            method: {
                get: "test"
            }
        },
        // resolver -> OUT
        // static file
        {
            static: [
                "/auth",
                "/protected.html"
            ],  // list of routes, for each applying resolver
            resolve: {
                //authResolver: authResolver
            }
        },
        {
            // TODO
            redirect:   {
                from: "/test/redirect",
                to:   "/api/user/info"
            }
        },
        {
            // TODO
            static: "/test1.html"
        },
        {
            // TODO
            static: "client/sub"
        }
        */
    ]
};

module.exports = {
    services: {
        main: mainService
    },
    default: {
        // all else fails
        static: [
            "client/test2.html"
        ],
        // "/"
        root: "client/index.html"
    }
};
