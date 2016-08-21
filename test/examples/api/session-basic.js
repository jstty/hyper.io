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

          expect(res.body).to.have.keys(['hello', 'session']);

          expect(res.body.hello).to.be.a('string');
          expect(res.body.hello).to.equal('world');

          expect(res.body.session).to.be.a('object');

          if (done) done();
        });
    }
    else {
      if (done) done();
    }
  }
];
