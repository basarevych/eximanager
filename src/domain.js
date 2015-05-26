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
            for (var i = 0; i < items.length; i++) {
                items[i] = { name: directories[i].name };
                (function (index) {
                    fm.countLines(config['config_dir'] + '/' + items[index].name + '/master.passwd')
                        .then(function (num) {
                            items[index]['users'] = num;
                            if (++userCounter == items.length)
                                userDefer.resolve();
                        });
                })(i);
            }

            q.all([ userDefer.promise ])
                .then(function () {
                    var rows = [];
                    items.forEach(function (el) {
                        rows.push([ el.name, el.users.toString() ]);
                    });
                    table.print([ 'Domain', 'Users' ], rows);
                });
        });
};
