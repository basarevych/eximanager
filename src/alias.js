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
        table = this.sl.get('table');

    var dirname = config['config_dir'] + '/' + domain;
    if (!fs.existsSync(dirname)) {
        console.error("Error:\tDomain " + domain + " does not exist");
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
        });
};

Alias.prototype.set = function (domain, alias, target) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager');

    var dirname = config['config_dir'] + '/' + domain;
    if (!fs.existsSync(dirname)) {
        console.error("Error:\tDomain " + domain + " does not exist");
        return;
    }

    fm.writeSimpleFile(dirname + '/aliases', alias, target);
};

Alias.prototype.del = function (domain, alias) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager');

    var dirname = config['config_dir'] + '/' + domain;
    if (!fs.existsSync(dirname)) {
        console.error("Error:\tDomain " + domain + " does not exist");
        return;
    }

    var filename = dirname + '/aliases';
    fm.lookup(filename, alias)
        .then(function (value) {
            if (value.length == 0) {
                console.error("Error:\tAlias " + alias + " at " + domain + " does not exist");
                return;
            }

            fm.rmKey(filename, alias);
        });
};
