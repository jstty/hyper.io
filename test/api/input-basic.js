var common  = require('../util/common.js');
var request = common.request;
var expect  = common.expect;

module.exports = [
    function (server, done) {
        expect(server).to.not.be.null;

        if(server) {
            request(server)
                .get('/hello?test1=123&test2=abc')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    expect(err).to.be.null;
                    expect(res.body).to.be.a('object');

                    expect(res.body).to.have.keys(["hello"]);

                    expect(res.body.hello).to.be.a('object');
                    expect(res.body.hello.test1).to.be.a('string');
                    expect(res.body.hello.test1).to.equal("123");

                    expect(res.body.hello.test2).to.be.a('string');
                    expect(res.body.hello.test2).to.equal("abc");

                    if(done) done();
                });
        } else {
            if(done) done();
        }
    }

    ,function (server, done) {
        expect(server).to.not.be.null;

        if(server) {
            request(server)
                .post('/hello')
                .send({test1:123, test2:"abc"})
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    expect(err).to.be.null;
                    expect(res.body).to.be.a('object');

                    expect(res.body).to.have.keys(["hello"]);
                    expect(res.body.hello).to.be.a('object');

                    expect(res.body.hello).to.have.keys(["test1", "test2"]);
                    expect(res.body.hello.test1).to.be.a('number');
                    expect(res.body.hello.test1).to.equal(123);

                    expect(res.body.hello.test2).to.be.a('string');
                    expect(res.body.hello.test2).to.equal("abc");

                    if(done) done();
                });
        } else {
            if(done) done();
        }
    }
    ,function (server, done) {
        expect(server).to.not.be.null;

        if(server) {
            request(server)
                .get('/world/test')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    expect(err).to.be.null;
                    expect(res.body).to.be.a('object');

                    expect(res.body).to.have.keys(["world"]);

                    expect(res.body.world).to.be.a('string');
                    expect(res.body.world).to.equal("test");

                    if(done) done();
                });
        } else {
            if(done) done();
        }
    }
];
