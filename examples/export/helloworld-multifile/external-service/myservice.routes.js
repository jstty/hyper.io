
// Routes
module.exports = [
    {
        api: "/hello",
        controller: "hello", // default "<service.directory>/controllers/<controller>.js"
        method: {
            get: "hello" // defined in controller module"
        }
    },
    {
        api: "/world",
        controller: "hello", // default "<service.directory>/controllers/<controller>.js"
        method: {
            get: "world" // defined in controller module"
        }
    }
];
