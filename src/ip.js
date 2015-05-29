'use strict'

var fs  = require('fs'),
    q   = require('q');

function Ip(serviceLocator) {
    this.sl = serviceLocator;

    this.sl.set('ip', this);
};

module.exports = Ip;

Ip.prototype.get = function (filter) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager'),
        table = this.sl.get('table');

    if (filter)
        filter = new RegExp(filter);

    fm.readSimpleFile(config['config_dir'] + '/exim.ip2mx')
        .then(function (rows) {
            var filtered;
            if (filter)
                filtered = rows.filter(function (el) { return filter.test(el[0]); });
            else
                filtered = rows;

            table.print([ 'IP', 'Name' ], filtered);
        });
};

Ip.prototype.set = function (ip, name) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager');

    fm.writeSimpleFile(config['config_dir'] + '/exim.ip2mx', ip, name);
};

Ip.prototype.del = function (ip) {
    var config = this.sl.get('config'),
        fm = this.sl.get('file-manager'),
        rl = this.sl.get('console').getReadline();

    var filename = config['config_dir'] + '/exim.ip2mx';
    fm.lookup(filename, ip)
        .then(function (value) {
            if (value.length == 0) {
                rl.write("Error:\tIP " + ip + " is not configured\n");
                rl.close();
                return;
            }

            fm.rmKey(filename, ip);
            rl.close();
        });
};
