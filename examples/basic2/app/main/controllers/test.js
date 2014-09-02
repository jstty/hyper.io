'use strict';

var _    = require('lodash');

module.exports = TestCtrl;

function TestCtrl($service, options){
    this.$service = $service;

    this.options  = _.merge({
    }, options);
}

// TODO: define input requirements


// localhost:8000/api/test1/:id?t1=123&t2=cheese#butter
TestCtrl.prototype.test = {
    input: {
        query: {
            t1: {
                required: true,
                type: "number" // array,string,number,date,boolean,object
            },
            t2: {
                type: "string"
            }
        },
        hash: {
            type: "string" // array,string,number,date,boolean,object
        },
        params: {
            id: {
                // required: true -> always true for urlParams
                type: "number" // array,string,number,date,boolean,object
            }
        },
        body: {
            t3: {
                type: "array"
            },
            t4: {
                type: "object"
            }
        }
    },
    run: function($input, $done)
    {
        console.log($input);
        $done({keyboard: "kitty"});
    }
}