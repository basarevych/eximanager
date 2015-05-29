'use strict'

var fs  = require('fs'),
    q   = require('q');

function User(serviceLocator) {
    this.sl = serviceLocator;

    this.sl.set('user', this);
};

module.exports = User;

User.prototype.get = function (domain, filter) {
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

    fm.readPasswordFiles(dirname)
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

User.prototype.set = function (domain, account, setPassword, setQuota) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager'),
        rl = this.sl.get('console').getReadline();

    var dirname = config['config_dir'] + '/' + domain;
    if (!fs.existsSync(dirname)) {
        rl.write("Error:\tDomain " + domain + " does not exist\n");
        rl.close();
        return;
    }

    var passwordDefer = q.defer();
    if (setPassword) {
        rl.question("New password: ", function (password) {
            rl.close();
            passwordDefer.resolve(password);
        });
    } else {
        rl.close();
        passwordDefer.resolve(null);
    }

    passwordDefer.promise
        .then(function (password) {
            return fm.writePasswordFiles(dirname, account, password);
        })
        .then(function () {
            if (setQuota == 'none') {
                fm.rmKey(dirname + '/quota', account);
            } else if (setQuota.toString().length) {
                fm.writeSimpleFile(dirname + '/quota', account, setQuota);
            }
        });
};

User.prototype.del = function (domain, account) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager'),
        rl = this.sl.get('console').getReadline();

    var dirname = config['config_dir'] + '/' + domain;
    if (!fs.existsSync(dirname)) {
        rl.write("Error:\tDomain " + domain + " does not exist\n");
        rl.close();
        return;
    }

    q.all([
        fm.lookup(dirname + '/master.passwd', account),
        fm.lookup(dirname + '/passwd', account)
    ]).then(function (result) {
        if (result[0].length == 0 && result[1].length == 0) {
            rl.write("Error:\tUser " + account + " at " + domain + " does not exist\n");
            rl.close();
            return;
        }

        fm.rmKey(dirname + '/master.passwd', account);
        fm.rmKey(dirname + '/passwd', account);
        fm.rmKey(dirname + '/quota', account);
        rl.close();
    });
};
