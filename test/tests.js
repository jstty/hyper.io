var _       = require('lodash');
var hyper   = require('../index.js');
var path    = require('path');

var rootDir = process.cwd();
var port = 9000;
var servers = [];

var list = {
    "api": {
          'helloworld-singlefile': 'app'
        , 'helloworld-multifile':  'app'
        , 'helloworld-custompath': 'app'

        , 'multiservice-singlefile': 'app'
        , 'multiservice-multifile':  'app'

        , 'resolver-basic': 'app'

        , 'resource-singlefile': 'app'
        , 'resource-multifile':  'app'
        , 'resource-sqlite':     'app'
    },
    "config": {
          'helloworld-singlefile':   'app'
        , 'helloworld-multifile':    'myserver'
        , 'multiservice-singlefile': 'server'
    }
};

// iterate over all test groups
_.forEach(list, function(testList, item){
    // create group for each test
    describe(item, function() {
        // iterate over all tests in group
        _.forEach(testList, function(appName, name) {

            // create sub-group for each test
            it(name, function() {
                var _port = null;
                var dt = path.join(rootDir, '.' + path.sep + 'test' + path.sep + item + path.sep + name +'.js');
                //console.log("dt:", dt, "\n");
                var tests = require(dt);

                // initialize server for test
                before(function(done){
                    _port = port++;

                    var d = path.join(rootDir, 'examples' + path.sep + item + path.sep + name);
                    //console.log("d:", d, "\n");
                    process.chdir(d);
                    console.log("cwd:", process.cwd(), "\n");

                    servers[_port] = {};
                    servers[_port].config = config = {
                        appName: appName,
                        env: "dev",
                        silent: true,
                        port: _port
                    };

                    process.env.HYPER_OPTIONS = JSON.stringify(servers[_port].config);

                    var app = null;
                    // try to load app.js file
                    try {
                        var appFile = path.resolve('.' + path.sep + appName + '.js');
                        console.log("appFile:", appFile, "\n");
                        app = require(appFile);
                    } catch(err) {}

                    if(app) {
                        app.then(function (_app) {
                            servers[_port].server = _app.getHttpFramework().getServer();
                            done();
                        });
                    } else {
                        done();
                    }
                });

                // iterated over all sub-tests for a single group test
                tests.forEach(function(test, idx) {
                    it("Test "+idx, function() {
                        test(servers[_port].server)
                    });
                });
            });
        });

    });
});
