var common  = require('../../util/common.js');
var request = common.request;
var expect  = common.expect;

var cheerio = require('cheerio');

module.exports = [
  function (server, done) {
    expect(server).to.not.be.null;

    if (server) {
      request(server)
        .get('/')
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.be.a('string');
          expect(res.text).to.have.length.above(10);
          // console.log('helloworld-basic data:', res.text);

          var $ = cheerio.load(res.text);
          expect($('#header').text()).to.equal('Hello World!');

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
        .get('/main.css')
        .expect('Content-Type', /text/)
        .expect(200)
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.be.a('string');
          expect(res.text).to.have.length.above(10);
          // console.log('helloworld-basic data:', res.text);

          if (done) done();
        });
    }
    else {
      if (done) done();
    }
  }
];
