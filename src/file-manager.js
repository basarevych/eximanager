'use strict'

var fs      = require('fs'),
    q       = require('q'),
    path    = require('path'),
    mkdirp  = require('mkdirp'),
    userid  = require('userid');

function FileManager(serviceLocator) {
    this.sl = serviceLocator;

    this.sl.set('file-manager', this);
};

module.exports = FileManager;

FileManager.prototype.checkDir = function (dirname) {
    var logger = this.sl.get('logger'),
        config = this.sl.get('config'),
        defer = q.defer();

    if (fs.existsSync(dirname)) {
        var stat = fs.statSync(dirname);
        if (!stat.isDirectory()) {
            logger.error("Target is not a directory: " + dirname);
            defer.reject();
            return promise;
        }

        defer.resolve();
        return defer.promise;
    }

    mkdirp(dirname, { mode: config['dir_mode'] }, function (err) {
        if (err) {
            logger.error("Error creating directory: " + dinamer, err);
            defer.reject(err);
            return;
        }

        if (process.getuid() != 0) {
            defer.resolve();
            return;
        }

        fs.chown(dirname, userid.uid(config['user']), userid.gid(config['group']), function (err) {
            if (err) {
                logger.error("Error changing owner to: " + config['user'] + ':' + config['group'], err);
                defer.reject();
                return;
            }

            defer.resolve();
        });
    });

    return defer.promise;
};

FileManager.prototype.checkFile = function (filename, mode) {
    var logger = this.sl.get('logger'),
        config = this.sl.get('config'),
        defer = q.defer();

    if (fs.existsSync(filename)) {
        var stat = fs.statSync(filename);
        if (!stat.isFile()) {
            logger.error("Target is not a file: " + filename);
            defer.reject();
            return promise;
        }

        defer.resolve();
        return defer.promise;
    }

    this.checkDir(path.dirname(filename))
        .then(function () {
            fs.open(filename, "a", config['file_mode'], function (err, fd) {
                if (err) {
                    logger.error("Error creating file: " + filename, err);
                    defer.reject(err);
                    return;
                }

                fs.closeSync(fd);

                if (process.getuid() != 0) {
                    defer.resolve();
                    return;
                }

                fs.chown(filename, userid.uid(config['user']), userid.gid(config['group']), function (err) {
                    if (err) {
                        logger.error("Error changing owner to: " + config['user'] + ':' + config['group'], err);
                        defer.reject();
                        return;
                    }

                    defer.resolve();
                });
            });
        })
        .catch(function () {
            defer.reject();
        });

    return defer.promise;
};

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
            if (fields[0].trim() == key) {
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

FileManager.prototype.readSimpleFile = function (filename) {
    var logger = this.sl.get('logger'),
        defer = q.defer();

    if (!fs.existsSync(filename)) {
        defer.resolve([]);
        return defer.promise;
    }

    fs.readFile(filename, 'utf-8', function (err, data) {
        if (err) {
            logger.error("Error reading file: " + filename, err);
            defer.reject(err);
            return;
        }

        var result = [];
        var lines = data.split("\n");
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].trim() == "")
                continue;

            var fields = lines[i].split(":");
            for (var i = 0; i < fields.length; i++)
                fields[i] = fields[i].trim();
            result.push(fields);
        }

        defer.resolve(result);
    });

    return defer.promise;
};

FileManager.prototype.writeSimpleFile = function (filename, key, value) {
    var logger = this.sl.get('logger'),
        defer = q.defer();

    this.checkFile(filename)
        .then(function () {
            fs.readFile(filename, 'utf-8', function (err, data) {
                if (err) {
                    logger.error("Error reading file: " + filename, err);
                    defer.reject(err);
                    return;
                }

                var result = "", found = false;
                var lines = data.split("\n");
                for (var i = 0; i < lines.length; i++) {
                    if (lines[i].trim() == "")
                        continue;

                    var columns = lines[i].split(':');
                    var thisKey = columns.shift().trim();
                    var thisValue = columns.join(':').trim();
                    if (thisKey == key) {
                        found = true;
                        thisValue = value;
                    }

                    result += thisKey + ': ' + thisValue + "\n";
                }

                if (!found)
                    result += key + ': ' + value + "\n";

                fs.writeFile(filename, result, 'utf-8', function (err) {
                    if (err) {
                        logger.error("Error writing file: " + filename, err);
                        defer.reject(err);
                        return;
                    }

                    defer.resolve();
                });
            });
        });

    return defer.promise;
};

FileManager.prototype.rmDir = function (dirname) {
    var me = this,
        logger = this.sl.get('logger'),
        defer = q.defer();

    if (!fs.existsSync(dirname)) {
        defer.resolve();
        return defer.promise;
    }

    this.iterateDir(dirname)
        .then(function (files) {
            var tasks = [];
            files.forEach(function (item) {
                var thisFile = dirname + '/' + item.name;
                if (item.stats.isDirectory()) {
                    tasks.push(me.rmDir(thisFile));
                    return;
                }

                var task = q.defer();
                tasks.push(task.promise);
                fs.unlink(thisFile, function (err) {
                    if (err) {
                        logger.error("Error deleting file: " + thisFile, err);
                        task.reject(err);
                        return;
                    }

                    task.resolve();
                });
            });

            q.all(tasks)
                .then(function () {
                    fs.rmdir(dirname, function (err) {
                        if (err) {
                            logger.error("Error deleting directory: " + dirname, err);
                            defer.reject(err);
                            return;
                        }

                        defer.resolve();
                    });
                })
                .catch(function (err) {
                    defer.reject(err);
                });
        })
        .catch(function (err) {
            defer.reject(err);
        });

    return defer.promise;
};

FileManager.prototype.rmKey = function (filename, key) {
    var logger = this.sl.get('logger'),
        defer = q.defer();

    this.checkFile(filename)
        .then(function () {
            fs.readFile(filename, 'utf-8', function (err, data) {
                if (err) {
                    logger.error("Error reading file: " + filename, err);
                    defer.reject(err);
                    return;
                }

                var result = "";
                var lines = data.split("\n");
                for (var i = 0; i < lines.length; i++) {
                    if (lines[i].trim() == "")
                        continue;

                    var columns = lines[i].split(':');
                    var thisKey = columns.shift().trim();
                    var thisValue = columns.join(':').trim();
                    if (thisKey == key)
                        continue;

                    result += thisKey + ': ' + thisValue + "\n";
                }

                fs.writeFile(filename, result, 'utf-8', function (err) {
                    if (err) {
                        logger.error("Error writing file: " + filename, err);
                        defer.reject(err);
                        return;
                    }

                    defer.resolve();
                });
            });
        });

    return defer.promise;
};
