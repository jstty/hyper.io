var common  = require('../util/common.js');
var request = common.request;
var expect  = common.expect;

module.exports = [
    function (server, done) {
        expect(server).to.not.be.null;

        if(server) {
            request(server)
                .get('/hello')
                .expect('Content-Type', /html/)
                .expect(200)
                .end(function (err, res) {
                    expect(err).to.be.null;
                    expect(res.text).to.be.a('string');

                    expect(res.text).to.match(/hello world - ([0-9])\w+/);
                    if(done) done();
                });
        } else {
            if(done) done();
        }
    }
];
