
// Internet Service Routes
module.exports = [
  {
    api:        '/ws/event/update',
    controller: 'event', // default "<service.directory>/controllers/<controller>.js"
    method:     {
      get: 'update' // defined in controller module"
    }
  }
];
