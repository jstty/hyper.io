var common  = require('../../util/common.js');
var request = common.request;
var expect  = common.expect;

module.exports = [
    function (server, done) {
        expect(server).to.not.be.null;

        if (server) {
            request(server)
                .get('/hello')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    expect(err).to.be.null;
                    expect(res.body).to.be.a('object');

                    expect(res.body).to.have.keys("hello");
                    expect(res.body.hello).to.equal("world");
                    if(done) done();
                });
        } else {
            if(done) done();
        }
    },
    function (server, done) {
        expect(server).to.not.be.null;

        if (server) {
            request(server)
                .get('/world')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    expect(err).to.be.null;
                    expect(res.body).to.be.a('object');

                    expect(res.body).to.have.keys("hello");
                    expect(res.body.hello).to.equal("world");
                    if(done) done();
                });
        } else {
            if(done) done();
        }
    }
];
