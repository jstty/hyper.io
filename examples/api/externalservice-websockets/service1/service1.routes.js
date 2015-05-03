
// Routes
module.exports = [
    {
        api: "/service1/hello",
        controller: "hello", // default "<service.directory>/controllers/<controller>.js"
        method: {
            get: "hello" // defined in controller module"
        }
    },
    {
        static: 'static'
    }
];
