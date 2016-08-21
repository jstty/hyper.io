
module.exports = Service2;

function Service2 ($logger, $resource) {
  $logger.log('Service 2 - Init');

  $resource.add('s2Hello', require('./service2.resource.hello.js'));
}
