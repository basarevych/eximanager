'use strict'

var fs  = require('fs'),
    q   = require('q');

function Domain(serviceLocator) {
    this.sl = serviceLocator;

    this.sl.set('domain', this);
};

module.exports = Domain;

Domain.prototype.list = function () {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager'),
        table = this.sl.get('table');

    fm.iterateDir(config['config_dir'])
        .then(function (files) {
            var directories = files.filter(function (el) { return el.stats.isDirectory(); });

            var items = new Array(directories.length);
            var userDefer = q.defer(), userCounter = 0;
            var aliasDefer = q.defer(), aliasCounter = 0;
            for (var i = 0; i < items.length; i++) {
                items[i] = { name: directories[i].name };
                (function (index) {
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

            q.all([ userDefer.promise, aliasDefer.promise ])
                .then(function () {
                    var rows = [];
                    items.forEach(function (el) {
                        rows.push([ el.name, el.users.toString(), el.aliases.toString() ]);
                    });
                    table.print([ 'Domain', 'Users', 'Aliases' ], rows);
                });
        });
};
