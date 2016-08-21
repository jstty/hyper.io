'use strict';

module.exports = HelloCtrl;

function HelloCtrl () {
  this.data = { hello: 'world' };
}

// support all the same features as handles
// (eg, generators, promises, throw errors...)
HelloCtrl.prototype.$preRoute = function ($input, $error, $q) {
  if (!$input.query || !$input.query.q) {
        // TODO: support throwing errors
    $error('missing search input', 404);
        /*
        throw new Error({
            errorCode: 404,
            errorMsg: 'missing search input'
        });
        */
  }
  else {
        // can return promise, like handler
    return $q.resolve({
      pre:  $input.query.q,
      data: this.data
    });
  }
};

// not called if error thown
HelloCtrl.prototype.$postRoute = function ($output) {
  if ($output.code > 399) {
    var errorMsg = $output.data;
    $output.data = {
      errorMsg:  errorMsg,
      errorCode: $output.code
    };
  }
  else {
        // can return data, like handler
    $output.data.post = 'test2';
  }

  return $output;
};

// localhost:8000/hello
HelloCtrl.prototype.hello = function ($done, $output) {
  $output.data.hello = 'test hello';
  return $output;
};

/*
//TODO make this same $routes example in ES6, decortators would be nice
//make hyper controller class?
HelloCtrl.prototype.$routes = {};

// localhost:8000/hello
// like decortators for the handler
HelloCtrl.prototype.$routes.hello = {
    api: "/hello",
    // method default "get"
};
HelloCtrl.prototype.hello = function($done, $output)
{
    $output.data.hello = 'test hello';
    return $output;
};

// localhost:8000/world
// like decortators for the handler
HelloCtrl.prototype.$routes.world = {
    api: "/world",
    method: "get" // could be array (eg ["get"])
};
HelloCtrl.prototype.world = function()
{
    return this.data;
};
*/
