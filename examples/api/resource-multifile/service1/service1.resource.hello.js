'use strict';

module.exports = resourceHello;

function resourceHello() {
}

resourceHello.prototype.world = function() {
    return {
        hello: "world service 1 resource",
        ts: new Date()
    };
};
