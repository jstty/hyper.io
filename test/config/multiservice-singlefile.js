var common  = require('../util/common.js');
var request = common.request;
var expect  = common.expect;

module.exports = [
    function (server, done) {
        expect(server).to.not.be.null;
        if(server) {
            request(server)
                .get('/service1/hello')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    expect(err).to.be.null;
                    expect(res.body).to.be.a('object');

                    expect(res.body).to.have.keys(["config", "ts", "source"]);
                    expect(res.body.source).to.equal("service1");
                    expect(res.body.config.from).to.not.be.null;
                    expect(res.body.config.from).to.equal("Service 1");
                    if(done) done();
                });
        } else {
            if(done) done();
        }
    },
    function (server, done) {
        expect(server).to.not.be.null;
        if(server) {
            request(server)
                .get('/service2/hello')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    expect(err).to.be.null;
                    expect(res.body).to.be.a('object');

                    expect(res.body).to.have.keys(["config", "ts", "source"]);
                    expect(res.body.source).to.equal("service2");
                    expect(res.body.config.from).to.not.be.null;
                    expect(res.body.config.from).to.equal("Service 2");
                    if(done) done();
                });
        } else {
            if(done) done();
        }
    }

];