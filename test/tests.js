var hyper   = require('../index.js');
var path    = require('path');

var rootDir = process.cwd();
var port = 9000;
var servers = [];

var list = {
    "api": [
        'helloworld-singlefile',
        'helloworld-multifile',
        'helloworld-custompath',
        'multiservice-singlefile'
    ]
};

// iterate over all test groups
for(var item in list) {
    // create group for each test
    describe(item, function() {
        var testList = list[item];

        // iterate over all tests in group
        testList.forEach(function(name) {

            // create sub-group for each test
            describe(name, function() {
                var _port = null;
                var tests = require(path.join(rootDir, '.' + path.sep + 'test' + path.sep + item + path.sep + name +'.js'));

                // initialize server for test
                before(function(done){
                    var dir = testList.shift();
                    // no more shortcut, exit
                    if(!dir) { return done(); }

                    _port = port++;

                    var d = path.join(rootDir, 'examples' + path.sep + item + path.sep + dir);
                    //console.log("d:", d, "\n");
                    process.chdir(d);
                    //console.log("cwd:", process.cwd(), "\n");

                    servers[_port] = {};
                    servers[_port].config = config = {
                        appName: "app",
                        env: "dev",
                        silent: true,
                        port: _port
                    };

                    process.env.HYPER_OPTIONS = JSON.stringify(servers[_port].config);

                    var app = null;
                    // try to load app.js file
                    try {
                        var appFile = path.resolve('./app.js');
                        app = require(appFile);
                    } catch(err) {}

                    // if failed toload app.js file, try index.js
                    if(!app) {
                        try {
                            var appFile = path.resolve('./index.js');
                            app = require(appFile);
                        } catch(err) {}
                    }

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
                    it("Test "+idx, function(done) {
                        test(servers[_port].server, done);
                    });
                });
            });
        });

    });
}
