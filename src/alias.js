'use strict'

var fs  = require('fs'),
    q   = require('q');

function Alias(serviceLocator) {
    this.sl = serviceLocator;

    this.sl.set('alias', this);
};

module.exports = Alias;

Alias.prototype.get = function (domain, filter) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager'),
        table = this.sl.get('table'),
        rl = this.sl.get('console').getReadline();

    var dirname = config['config_dir'] + '/' + domain;
    if (!fs.existsSync(dirname)) {
        rl.write("Error:\tDomain " + domain + " does not exist\n");
        rl.close();
        return;
    }

    if (filter)
        filter = new RegExp(filter);

    fm.readSimpleFile(dirname + '/aliases')
        .then(function (rows) {
            var filtered;
            if (filter)
                filtered = rows.filter(function (el) { return filter.test(el[0]); });
            else
                filtered = rows;

            table.print([ 'Alias', 'Target' ], filtered);
            rl.close();
        });
};

Alias.prototype.set = function (domain, alias, target) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager'),
        rl = this.sl.get('console').getReadline();

    var dirname = config['config_dir'] + '/' + domain;
    if (!fs.existsSync(dirname)) {
        rl.write("Error:\tDomain " + domain + " does not exist\n");
        rl.close();
        return;
    }

    fm.writeSimpleFile(dirname + '/aliases', alias, target);
    rl.close();
};

Alias.prototype.del = function (domain, alias) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager'),
        rl = this.sl.get('console').getReadline();

    var dirname = config['config_dir'] + '/' + domain;
    if (!fs.existsSync(dirname)) {
        rl.write("Error:\tDomain " + domain + " does not exist\n");
        rl.close();
        return;
    }

    var filename = dirname + '/aliases';
    fm.lookup(filename, alias)
        .then(function (value) {
            if (value.length == 0) {
                rl.write("Error:\tAlias " + alias + " for " + domain + " does not exist\n");
                rl.close();
                return;
            }

            fm.rmKey(filename, alias);
            rl.close();
        });
};
