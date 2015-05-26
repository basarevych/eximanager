'use strict'

function Init(serviceLocator) {
    this.sl = serviceLocator;

    this.sl.set('init', this);
};

module.exports = Init;

Init.prototype.createConfig = function (dir) {
    var rl = this.sl.get('console').getReadline(),
        fm = this.sl.get('file-manager');

    dir += '/';
    dir = dir.replace(/\/{2,}/, '/');

    var filename = dir + 'eximanager.conf.js';

    var locations = [ '/etc/', '/usr/local/etc/' ];
    if (locations.indexOf(dir) == -1)
        rl.write("\nWarning:\tUnusual location: " + dir + "\n");

    fm.copyFile(__dirname + '/../config.js.dist', filename)
        .then(function () {
            rl.write("\nConfiguration file (" + filename + ") created - please edit it\n\n");
        })
        .finally(function () {
            rl.close();
        });
};
