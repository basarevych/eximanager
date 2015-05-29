'use strict'

var fs  = require('fs'),
    q   = require('q');

function Quota(serviceLocator) {
    this.sl = serviceLocator;

    this.sl.set('quota', this);
};

module.exports = Quota;

Quota.prototype.get = function (domain, filter) {
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

    fm.readSimpleFile(dirname + '/quota')
        .then(function (rows) {
            var filtered;
            if (filter)
                filtered = rows.filter(function (el) { return filter.test(el[0]); });
            else
                filtered = rows;

            table.print([ 'Account', 'Quota' ], filtered);
            rl.close();
        });
};

Quota.prototype.set = function (domain, account, quota) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager'),
        rl = this.sl.get('console').getReadline();

    var dirname = config['config_dir'] + '/' + domain;
    if (!fs.existsSync(dirname)) {
        rl.write("Error:\tDomain " + domain + " does not exist\n");
        rl.close();
        return;
    }

    fm.writeSimpleFile(dirname + '/quota', account, quota);
    rl.close();
};

Quota.prototype.del = function (domain, account) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager'),
        rl = this.sl.get('console').getReadline();

    var dirname = config['config_dir'] + '/' + domain;
    if (!fs.existsSync(dirname)) {
        rl.write("Error:\tDomain " + domain + " does not exist\n");
        rl.close();
        return;
    }

    var filename = dirname + '/quota';
    fm.lookup(filename, account)
        .then(function (value) {
            if (value.length == 0) {
                rl.write("Error:\tQuota for " + account + " at " + domain + " is not set\n");
                rl.close();
                return;
            }

            fm.rmKey(filename, account);
            rl.close();
        });
};
