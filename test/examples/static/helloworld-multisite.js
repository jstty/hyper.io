var common  = require('../../util/common.js');
var request = common.request;
var expect  = common.expect;

var cheerio = require('cheerio');

module.exports = [
  // /hello
  function (server, done) {
    expect(server).to.not.be.null;

    if (server) {
      request(server)
        .get('/hello/')
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.be.a('string');
          // console.log('helloworld-multisite length:', res.text.length, ', data:', res.text);
          expect(res.text).to.have.length.above(10);

          var $ = cheerio.load(res.text);
          expect($('#header a').text()).to.equal('World');

          if (done) done();
        });
    }
    else {
      if (done) done();
    }
  },
  // /world
  function (server, done) {
    expect(server).to.not.be.null;

    if (server) {
      request(server)
        .get('/world/')
        .expect('Content-Type', /text/)
        .expect(200)
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.be.a('string');
          // console.log('helloworld-multisite length:', res.text.length, ', data:', res.text);
          expect(res.text).to.have.length.above(10);

          var $ = cheerio.load(res.text);
          expect($('#header a').text()).to.equal('Hello');
          
          if (done) done();
        });
    }
    else {
      if (done) done();
    }
  },
  // /hello/test (this is not a valid path and should a 404)
  function (server, done) {
    expect(server).to.not.be.null;

    if (server) {
      request(server)
        .get('/hello/test')
        .expect('Content-Type', /html/)
        .expect(404)
        .end(function (err, res) {
          expect(err).to.be.null;
          
          if (done) done();
        });
    }
    else {
      if (done) done();
    }
  },
  // /world/test (this is not a valid path and should return "index.html" as default)
  function (server, done) {
    expect(server).to.not.be.null;

    if (server) {
      request(server)
        .get('/world/test')
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function (err, res) {
          expect(err).to.be.null;
          expect(res.text).to.be.a('string');
          // console.log('helloworld-multisite length:', res.text.length, ', data:', res.text);
          expect(res.text).to.have.length.above(10);

          var $ = cheerio.load(res.text);
          expect($('#header a').text()).to.equal('Hello');
          
          if (done) done();
        });
    }
    else {
      if (done) done();
    }
  }
];
