var hyper   = require('../../../index.js');
var request = require('supertest');
var chai    = require('chai');
var expect  = chai.expect;

var config = {
    env: "prod",
    silent: false,
    hyper: {
        logger: { // logz options
            name: "HyperServiceManager",
            replaceConsole: false
        },
        displayDebuggerInfo: false,
        httpFramework: 'express'
    }
};

// ----------------------
describe("HelloWorld", function() {
    var app = hyper(config);
    var server = null;

    before(function(done) {
        app
        .start({
            routes: [
                {
                    api: "/hello",
                    method: {
                        get: function world($done) {
                            $done({hello: "world"});
                        }
                    }
                }
            ]
        })
        .then(function () {
            server = app.getHttpFramework().getServer();
            done();
        });
    });

    it("Single API", function(done) {
        expect(server).to.not.be.null;

        if(server) {
            request(server)
                .get('/hello')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log('test');
                    expect(err).to.be.null;
                    expect(res.body).to.have.keys("hello");
                    expect(res.body.hello).to.equal("world");
                    done();
                });
        } else {
            done();
        }
    });
});
