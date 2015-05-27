'use strict'

var fs  = require('fs'),
    q   = require('q');

function FileManager(serviceLocator) {
    this.sl = serviceLocator;

    this.sl.set('file-manager', this);
};

module.exports = FileManager;

FileManager.prototype.iterateDir = function (dir) {
    var logger = this.sl.get('logger'),
        defer = q.defer();

    fs.readdir(dir, function (err, files) {
        if (err) {
            logger.error("Failed to read directory", err);
            defer.reject(err);
            return;
        }

        var result = [];

        files
            .sort()
            .forEach(function (file) {
                var stats = fs.statSync(dir + '/' + file);
                result.push({
                    name: file,
                    stats: stats,
                });
            });

        defer.resolve(result);
    });

    return defer.promise;
};

FileManager.prototype.countLines = function (filename) {
    var logger = this.sl.get('logger'),
        defer = q.defer();

    if (!fs.existsSync(filename)) {
        defer.resolve(0);
        return defer.promise;
    }

    var count = 0;
    fs.createReadStream(filename)
        .on('data', function (chunk) {
            for (var i = 0; i < chunk.length; ++i) {
                if (chunk[i] == "\n".charCodeAt(0))
                    count++;
            }
        })
        .on('error', function (err) {
            logger.error('Error reading file: ' + filename, err);
            defer.reject(err);
        })
        .on('end', function() {
            defer.resolve(count);
        });

    return defer.promise;
};

FileManager.prototype.lookup = function (filename, key) {
    var logger = this.sl.get('logger'),
        defer = q.defer();

    if (!fs.existsSync(filename)) {
        defer.resolve("");
        return defer.promise;
    }

    fs.readFile(filename, 'utf-8', function (err, data) {
        if (err) {
            logger.error("Error reading file: " + filename, err);
            defer.reject(err);
            return;
        }

        var lines = data.split("\n");
        for (var i = 0; i < lines.length; i++) {
            var fields = lines[i].split(":");
            if (fields[0] == key) {
                fields.shift();
                defer.resolve(fields.join(":").trim());
                return;
            }
        }

        defer.resolve("");
    });

    return defer.promise;
};

FileManager.prototype.copyFile = function (source, target) {
    var logger = this.sl.get('logger'),
        defer = q.defer();

    var rd = fs.createReadStream(source);
    rd.on("error", function (err) {
        logger.error("Error reading file: " + source, err);
        defer.reject(err);
    });

    var wr = fs.createWriteStream(target);
    wr.on("error", function(err) {
        logger.error("Error writing file: " + target, err);
        defer.reject(err);
    });
    wr.on("close", function(ex) {
        defer.resolve();
    });

    rd.pipe(wr);
    return defer.promise;
};
