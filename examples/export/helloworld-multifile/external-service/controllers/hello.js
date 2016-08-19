'use strict';

module.exports = HelloCtrl;

function HelloCtrl(){
    this.data = { hello: "world" };
}

// localhost:8000/hello
HelloCtrl.prototype.hello = function($done, $config)
{
    $done( $config );
};

// localhost:8000/world
HelloCtrl.prototype.world = function()
{
    return this.data;
};

// localhost:8000/test
HelloCtrl.prototype.test = function(util)
{
    return util.test();
};
