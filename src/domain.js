'use strict'

var fs  = require('fs'),
    q   = require('q');

function Domain(serviceLocator) {
    this.sl = serviceLocator;

    this.sl.set('domain', this);
};

module.exports = Domain;

Domain.prototype.get = function (filter) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager'),
        table = this.sl.get('table');

    if (filter)
        filter = new RegExp(filter);

    fm.checkDir(config['config_dir'])
        .then(function () { return fm.iterateDir(config['config_dir']); })
        .then(function (files) {
            var directories = files.filter(function (el) {
                if (!el.stats.isDirectory())
                    return false;

                if (filter)
                    return filter.test(el.name);

                return true;
            });

            var items = new Array(directories.length);
            var mxDefer = q.defer(), mxCounter = 0;
            var userDefer = q.defer(), userCounter = 0;
            var aliasDefer = q.defer(), aliasCounter = 0;
            for (var i = 0; i < items.length; i++) {
                items[i] = { name: directories[i].name };
                (function (index) {
                    fm.lookup(config['config_dir'] + '/exim.domain2mx', items[index].name)
                        .then(function (result) {
                            items[index]['mx'] = result;
                            if (++mxCounter == items.length)
                                mxDefer.resolve();
                        });
                    fm.countLines(config['config_dir'] + '/' + items[index].name + '/master.passwd')
                        .then(function (num) {
                            items[index]['users'] = num;
                            if (++userCounter == items.length)
                                userDefer.resolve();
                        })
                        .catch(function () {
                            userDefer.reject();
                        });
                    fm.countLines(config['config_dir'] + '/' + items[index].name + '/aliases')
                        .then(function (num) {
                            items[index]['aliases'] = num;
                            if (++aliasCounter == items.length)
                                aliasDefer.resolve();
                        })
                        .catch(function () {
                            aliasDefer.reject();
                        });
                })(i);
            }

            q.all([ mxDefer.promise, userDefer.promise, aliasDefer.promise ])
                .then(function () {
                    var rows = [];
                    items.forEach(function (el) {
                        rows.push([
                            el.name,
                            el.mx,
                            el.users.toString(),
                            el.aliases.toString()
                        ]);
                    });
                    table.print([ 'Domain', 'MX', 'Users', 'Aliases' ], rows);
                });
        });
};

Domain.prototype.set = function (name, mx) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager');

    var dir = config['config_dir'] + '/' + name;
    fm.checkDir(dir)
        .then(function () { return fm.checkFile(config['config_dir'] + '/exim.domain2mx'); })
        .then(function () { return fm.checkFile(config['config_dir'] + '/exim.ip2mx'); })
        .then(function () { return fm.checkFile(config['config_dir'] + '/exim.filter'); })
        .then(function () { return fm.checkFile(dir + '/master.passwd'); })
        .then(function () { return fm.checkFile(dir + '/passwd'); })
        .then(function () { return fm.checkFile(dir + '/aliases'); })
        .then(function () { return fm.checkFile(dir + '/quota'); })
        .then(function () { return fm.checkDir(config['data_dir'] + '/' + name); })
        .then(function () {
            if (mx)
                fm.writeSimpleFile(config['config_dir'] + '/exim.domain2mx', name, mx);
        });
};

Domain.prototype.del = function (name) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager');

    fm.rmKey(config['config_dir'] + '/exim.domain2mx', name)
        .then(function () {
            var dirname = config['config_dir'] + '/' + name;
            if (!fs.existsSync(dirname)) {
                console.error("Error:\tDomain " + name + " does not exist");
                return;
            }

            fm.rmDir(dirname);
        });
};
