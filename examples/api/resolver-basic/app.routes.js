
/*
 * API:
 *      [required (middleware)] -> [input validator] -> [pre (middleware)] -> [resolve] -> controller method -> [post (middleware)] -> OUT (json)
 *
 * View:
 *      [required (middleware)] -> [input validator] -> [pre (middleware)] -> [resolve] -> controller method -> [post (middleware)] -> template (middleware) -> OUT (html)
 */

// required 'auth-basic' will auto require 'hyper.io-express-auth-basic'

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
