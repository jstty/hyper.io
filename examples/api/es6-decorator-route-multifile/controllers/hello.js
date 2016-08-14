'use strict';
var Hyper = require('../../../../index.js');

class HelloCtrl extends Hyper.classes.controller {
    constructor($logger) {
        this.logger = $logger;
    }

    // Future JSNext
    // @Hyper.decor.route({
    //   api: {
    //     route: '/hello',
    //     method: ['get']
    //   }
    // })
    hello($done) {
    /*@Hyper.route({
        "api": "/hello",
        "method": ["get"]
    })*/

        $done({ hello: "world1" });
    }

    world($done){
    //@Hyper.route({
    //    "api": "/world",
    //    "method": ["get"]
    //})

        $done({ hello: "world2" });
    }

}

// node 4/5 does not support export class
module.exports = HelloCtrl;

//
//
//function MyController2() {
//}
//Hyper.util.extends(MyController2, Hyper.classes.controller);
////
//
//MyController2.prototype.handler2 = function($done){
//    /*@Hyper.handler({
//     "api": {
//     "route": "/hello2",
//     "method": ["get"]
//     }
//     })*/
//
//    $done({hello:'world 2'});
//}

