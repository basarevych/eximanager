'use strict'

function Init(serviceLocator) {
    this.sl = serviceLocator;

    this.sl.set('init', this);
};

module.exports = Init;

Init.prototype.createConfig = function (dir) {
    var fm = this.sl.get('file-manager');

    dir += '/';
    dir = dir.replace(/\/{2,}/, '/');

    var filename = dir + 'eximanager.conf.js';

    var locations = [ '/etc/', '/usr/local/etc/' ];
    if (locations.indexOf(dir) == -1)
        console.error("\nWarning:\tUnusual location: " + dir);

    fm.copyFile(__dirname + '/../config.js.dist', filename)
        .then(function () {
            console.log("\nConfiguration file (" + filename + ") created - please edit it\n");
        });
};
