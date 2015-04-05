var request = require('supertest');
var chai    = require('chai');
var expect  = chai.expect;

module.exports = [
    function (server, done) {
        expect(server).to.not.be.null;

        if(server) {
            request(server)
                .get('/hello')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    expect(err).to.be.null;
                    expect(res.body).to.have.keys("hello");
                    expect(res.body.hello).to.equal("world");
                    done();
                });
        } else {
            done();
        }
    }
];