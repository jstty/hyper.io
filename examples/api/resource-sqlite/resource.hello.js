'use strict';

var sqlite3 = require('sqlite3').verbose();

module.exports = resourceHello;

function resourceHello ($q, $logger) {
  this.$q = $q;
  this._L = $logger;
  this.db = new sqlite3.Database(':memory:');
}

resourceHello.prototype.world = function () {
  var deferred = this.$q.defer();

  this.db.serialize(function () {
    this.db.run('CREATE TABLE IF NOT EXISTS test (info TEXT)');

    var stmt = this.db.prepare('INSERT INTO test VALUES (?)');
    stmt.run('td:' + (new Date()));
    stmt.finalize();

    this.db.all('SELECT rowid AS id, info FROM test', function (err, rows) {
      if (err) {
        this._L.error('DB Error:', err);
      }

      var outRow = [];
      rows.forEach(function (row) {
        outRow.push(row.id + ':' + row.info);
      });

      deferred.resolve({
        hello: 'world',
        ts:    outRow.join(', ')
      });
    });
  }.bind(this));

  return deferred.promise;
};
