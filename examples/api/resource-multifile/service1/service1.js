
module.exports = Service1;

function Service1 ($logger, $resource) {
  $logger.log('Service 1 - Init');

  // $resource.add returns insrance of module, $init put in Q
  var res = $resource.add('s1Hello', require('./service1.resource.hello.js'));
  try {
    var data = res.world();
    data.hello = '123';
  }
  catch (err) {
    $logger.error('Error:', err);
  }
}
