
module.exports = Service;

function Service($logger){
    $logger.log('Service - Constructor');
}

Service.prototype.$init = function ($logger) {
    $logger.log('Service - Init');
};
