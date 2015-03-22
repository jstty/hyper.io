'use strict';

var sqlite3 = require('sqlite3').verbose();

module.exports = resourceHello;

function resourceHello($q) {
    this.$q = $q;
    this.db = new sqlite3.Database(':memory:');
}

resourceHello.prototype.world = function() {
    var deferred = this.$q.defer();

    this.db.serialize(function() {
        this.db.run("CREATE TABLE IF NOT EXISTS test (info TEXT)");

        var stmt = this.db.prepare("INSERT INTO test VALUES (?)");
        stmt.run("td:"+(new Date()));
        stmt.finalize();

        this.db.all("SELECT rowid AS id, info FROM test", function(err, rows) {
            var outRow = [];
            rows.forEach(function (row) {
                outRow.push(row.id + ":" + row.info);
            });

            deferred.resolve({
                hello: "world",
                ts: outRow.join(', ')
            });
        }.bind(this));
    }.bind(this));

    return deferred.promise;
};
