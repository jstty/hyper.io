'use strict';

class HelloCtrl {
  constructor ($logger) {
    this.data = { hello: 'world' };
    this.logger = $logger;
  }

  // support all the same features as handles
  // (eg, generators, promises, throw errors...)
  $preRoute ($input, $error, $q) {
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
  }

  // not called if error thown
  $postRoute ($output) {
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
  }

  // localhost:8000/hello
  hello ($done, $output) {
    $output.data.hello = 'test hello';
    return $output;
  }
}

// node 4/5 does not support export class
module.exports = HelloCtrl;
