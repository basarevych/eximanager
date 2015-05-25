'use strict'

var fs  = require('fs'),
    q   = require('q');

function FileManager(serviceLocator) {
    this.sl = serviceLocator;

    this.sl.set('file-manager', this);
};

module.exports = FileManager;

FileManager.prototype.copyFile = function (source, target) {
    var logger = this.sl.get('logger');

    var defer = q.defer();

    var rd = fs.createReadStream(source);
    rd.on("error", function (err) {
        logger.error("Error reading file: " + err);
        defer.reject(err);
    });

    var wr = fs.createWriteStream(target);
    wr.on("error", function(err) {
        logger.error("Error writing file: " + err);
        defer.reject(err);
    });
    wr.on("close", function(ex) {
        defer.resolve();
    });

    rd.pipe(wr);
    return defer.promise;
};
