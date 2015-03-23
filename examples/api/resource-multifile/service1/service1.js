
module.exports = Service1;

function Service1($logger, $resource){
    $logger.log('Service 1 - Init');

    $resource.add('s1Hello', require('./service1.resource.hello.js'));
}
