'use strict';
var Hyper = require('../../../../index.js');

// var service = {
//     name: "myservice",
//     config: { hello: "world"},
//     module: require('./myservice.js'),
//     routes: require('./myservice.routes.js'),
//     controller: {
//         'hello': {
//             name:     'hello',
//             module:   require('./controllers/hello.js')
//         }
//     }
// };

// exports service module like above
var service = Hyper.export.service('myservice');

module.exports = service;
