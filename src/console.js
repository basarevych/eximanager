'use strict'

var readline = require('readline');

function Console(serviceLocator) {
    this.sl = serviceLocator;

    this.sl.set('console', this);
};

module.exports = Console;

Console.prototype.getReadline = function () {
    if (typeof this.rl != 'undefined')
        return this.rl;

    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return rl;
};
