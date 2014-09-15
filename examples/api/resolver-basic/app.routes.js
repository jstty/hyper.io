
/*
 * API:
 *      [required (plugin)] -> [input validator] -> [plugin-pre] -> [resolve] -> controller method -> [plugin-post] -> OUT (json)
 *
 * View:
 *      [required (plugin)] -> [input validator] -> [plugin-pre] -> [resolve] -> controller method -> [plugin-post] -> template -> OUT (html)
 */

// Routes
module.exports = [
    {
        api: '/hello.new',
        required: {
            'auth-basic': {
                user: 'hello',
                pass: 'world',
                message: 'Login with user:"hello" pass:"world"'
            }
        },
        resolve: {
            data: 'hello-data'
        },
        controller: "hello",
        method: {
            get: 'hello'
        }
    },
    {
        redirect: {
            from: '/hello',
            to: '/hello.new'
        }
    },
    {
        static: 'static'
    },
    {
        otherwise: {
            redirect: {
                to: '/'
            }
        }
    }
];
