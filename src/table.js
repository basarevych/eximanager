'use strict'

var sprintf = require("sprintf-js").sprintf;

function Table(serviceLocator) {
    this.sl = serviceLocator;

    this.sl.set('table', this);
};

module.exports = Table;

Table.prototype.print = function (header, rows) {
    if (header.length == 0)
        return;

    var rl = this.sl.get('console').getReadline();

    var widths = [];
    for (var i = 0; i < header.length; i++) {
        var columnWidth = header[i].length;
        rows.forEach(function (el) {
            if (el[i].length > columnWidth)
                columnWidth = el[i].length;
        });
        widths.push(columnWidth);

        rl.write(sprintf('%-' + (columnWidth + 2) + 's', " " + header[i]));
        rl.write(i == header.length - 1 ? "\n" : "|");
    }

    for (var i = 0; i < header.length; i++) {
        for (var j = 0; j < widths[i] + 2; j++)
            rl.write('-');
        rl.write(i == header.length - 1 ? "\n" : "+");
    }

    for (var i = 0; i < rows.length; i++) {
        for (var j = 0; j < rows[i].length; j++) {
            rl.write(sprintf('%-' + (widths[j] + 2) + 's', " " + rows[i][j]));
            rl.write(j == rows[i].length - 1 ? "\n" : "|");
        }
    }

    rl.close();
};
