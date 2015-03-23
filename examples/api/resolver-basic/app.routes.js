// Routes
module.exports = [
    {
        api: '/hello.new',
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
