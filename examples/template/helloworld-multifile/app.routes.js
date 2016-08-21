
// Routes
module.exports = [
  {
    view:     '/hello',
    template: {
            // type: "ejs",  // ejs will be detected based on file extension
      file: 'hello.ejs'
    },
    controller: 'hello', // default "<service.directory>/controllers/<controller>.js"
    method:     {
      get: 'world' // defined in controller module"
    }
  }
];
