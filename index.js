var isES6 = require('./lib/util.js').isES6;

if ( isES6() ) {
  module.exports = require('./lib/hyper.js');
} else {
  module.exports = require('./es5/hyper.js');
}
