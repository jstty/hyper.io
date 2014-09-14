'use strict';

var when = require('when');

module.exports = HelloDataResolver;

function HelloDataResolver(){
}

HelloDataResolver.prototype.data = function()
{
    return when.promise(function(resolve) {
        resolve( { hello: "world", ts: new Date() } );
    });
};
