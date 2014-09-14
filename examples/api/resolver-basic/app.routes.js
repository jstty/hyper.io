
/*
* API:
*      [input validator] -> [plugin-pre] -> [resolve] -> controller method -> [plugin-post] -> OUT (json)
*
* View:
*      [input validator] -> [plugin-pre] -> [resolve] -> controller method -> [plugin-post] -> template -> OUT (html)
*/
// Routes
module.exports = [
    {
        api: "/hello.new",

        pluginPre: {
            // TODO
            'auth-basic': 'required' // user/pass defined in config
        },
        pluginPost: {
            // TODO
            'force': 'download'
        },

        resolve: {
            data: 'hello-data'
        },
        controller: "hello",
        method: {
            get: "hello"
            // TODO: feature? maybe allow an object here so you can set the resolve per method
        }
    },
    {
        redirect: {
            from: "/hello",
            to: "/hello.new"
        }
    },
    {
        static: 'static'
    }
    /*
    ,{
        otherwise: {
            // TODO: status code rules
            '4xx': {
                redirect: {
                    to: "/"
                }
            }
        }
    }
    */
];
