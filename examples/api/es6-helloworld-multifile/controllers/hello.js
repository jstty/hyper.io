'use strict';

class HelloCtrl {
    constructor($logger) {
        this.logger = $logger;
    }

    // localhost:8000/hello
    hello($done)
    {
        $done({ hello: "world" });
    }
}

// node 4/5 does not support export class
module.exports = HelloCtrl;
