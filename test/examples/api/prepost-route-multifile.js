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
        .expect(404)
        .end(function (err, res) {
            // console.log('TEST 1 prepost-route-multifile err:', err, ', body:', res.body);

          expect(err).to.be.null;
          expect(res.body).to.be.a('object');

          expect(res.body).to.have.keys('errorMsg', 'errorCode');
          expect(res.body.errorMsg).to.equal('missing search input');
          expect(res.body.errorCode).to.equal(404);

          if (done) done();
        });
    }
    else {
      if (done) done();
    }
  },
  function (server, done) {
    expect(server).to.not.be.null;

    if (server) {
      request(server)
        .get('/hello?q=1')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (err, res) {
          // console.log('TEST 2 prepost-route-multifile err:', err, ', body:', res.body);

          expect(err).to.be.null;
          expect(res.body).to.be.a('object');

          expect(res.body).to.have.keys('pre', 'hello', 'post', 'data');
          expect(res.body.pre).to.equal('1');
          expect(res.body.hello).to.equal('test hello');
          expect(res.body.post).to.equal('test2');

          expect(res.body.data).to.be.a('object');
          expect(res.body.data).to.have.keys('hello');
          expect(res.body.data.hello).to.equal('world');

          if (done) done();
        });
    }
    else {
      if (done) done();
    }
  }
];
