'use strict';

module.exports = HelloCtrl;

function HelloCtrl(){
}

// localhost:8000/hello
HelloCtrl.prototype.world = function *($done, $q)
{
    var deferer = $q.defer();
    setTimeout(function(){
        deferer.resolve({ hello: "world" });
    }, 500);

    var data = yield deferer.promise;

    //$done( data );
    // OR
    return data;
};
