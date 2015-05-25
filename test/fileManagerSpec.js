'use strict';

var fs              = require('fs'),
    ServiceLocator  = require('../src/service-locator.js'),
    FileManager     = require('../src/file-manager.js');

describe("FileManager", function () {
    var sl, fm;

    beforeEach(function () {
        sl = new ServiceLocator();
        fm = new FileManager(sl);
    });

    it("copies file", function (done) {
        var filename = __dirname + '/../config.js.dist';

        fm.copyFile(filename, filename + '.tmp')
            .then(function () {
                var orig = fs.readFileSync(filename),
                    copy = fs.readFileSync(filename + '.tmp');

                fs.unlinkSync(filename + '.tmp');
                expect(copy).toEqual(orig);
                done();
            });
    });
});
