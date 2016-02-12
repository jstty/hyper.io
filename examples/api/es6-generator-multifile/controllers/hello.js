'use strict';

class HelloCtrl {
    constructor($logger) {

    }

    // localhost:8000/hello
    world($done, $q)
    {
        var deferer = $q.defer();
        setTimeout(function(){
            deferer.resolve({ hello: "world" });
        }, 500);

        //var data = yield deferer.promise;

        //$done( data );
        // OR
        return data;
    }
}

// node 4/5 does not support export class
module.exports = HelloCtrl;
