
// Routes
module.exports = [
  {
    api:        '/hello',
    controller: 'main', // default "<service.directory>/controllers/<controller>.js"
    method:     {
      get: 'hello' // defined in controller module"
    }
  },
  {
    api:        '/world',
    controller: 'main', // default "<service.directory>/controllers/<controller>.js"
    method:     {
      get: 'world' // defined in controller module"
    }
  }
];
