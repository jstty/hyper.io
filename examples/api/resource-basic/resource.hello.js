'use strict';

module.exports = resourceHello;

function resourceHello() {
}

resourceHello.prototype.world = function() {
    return {
        hello: "world",
        ts: new Date()
    };
};
