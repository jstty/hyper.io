var _        = require('lodash');
var path     = require('path');
var freeport = require('freeport');
var isES6    = require('is-es6');
var shell    = require('shelljs');

var common  = require('../util/common.js');
var expect  = common.expect;

var rootDir = __dirname;
// console.log("root dir:", rootDir, "\n");
var timeoutSec = 15 * 60; // 15 mins

var list = require('./tests-list.js');

// increase listener limit
process.setMaxListeners(0);

// iterate over all test groups
_.forEach(list, function (testList, item) {
    // create group for each test
  describe(item, function () {
    this.timeout(timeoutSec * 1000);

        // iterate over all tests in group
    _.forEach(testList, function (appName, name) {
      describe(name, function () {
                // create sub-group for each test
        var server = null;
        var dt = path.join(rootDir, '.' + path.sep + item + path.sep + name + '.js');
                // console.log("example test dir:", dt, "\n");
        var tests = require(dt);

        if (name.indexOf('es6') >= 0 && !isES6(['generators'])) {
                    // if es6 test and es6 is not enabled then don't run test
          console.log('Skipping Test "' + name + '"  because the current version of node does not support ES6.');
          return;
        }

                // initialize server for test
        before(function (done) {
          freeport(function (err, port) {
            if (err) {
              console.error('freeport Error:', err);
            }

            var d = path.join(rootDir,
                            '..' + path.sep + '..' + path.sep + 'examples' + path.sep +
                            item + path.sep + name);

                        // console.log("example dir:", d, "\n");
            process.chdir(d);
            shell.exec('npm install', { silent: true });
                        // console.log("cwd:", process.cwd(), "\n");

            server = {};
            server.config = {
              appName: appName,
              env:     'dev',
              silent:  true,
              port:    port
            };

            process.env.HYPER_OPTIONS = JSON.stringify(server.config);

            var app = null;
                        // try to load app.js file
            try {
              var appFile = path.resolve('.' + path.sep + appName + '.js');
                            // console.log("appFile:", appFile, "\n");
              app = require(appFile);
            }
            catch (err) {
              expect(err).not.to.be.null;
              console.error(err);
            }

                        // console.log("app:", !!app, "\n");
            expect(app).not.to.be.null;
            if (app) {
              expect(app.then).not.to.be.null;
              app.then(function (_app) {
                server.app = _app;
                server.httpFrameworkApp = _app.httpFramework().app();
                done();
              });
            }
            else {
              done();
            }
          });
        });

        after(function (done) {
          if (server && server.app) {
            server.app.stop()
                          .then(function () {
                            done();
                          });
          }
        });

                // iterated over all sub-tests for a single group test
        tests.forEach(function (test, idx) {
          it('Test ' + (idx + 1), function (done) {
            test(server.httpFrameworkApp, done);
          });
        });
      });
    });
  });
});
