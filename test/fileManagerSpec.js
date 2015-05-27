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

    it("counts lines", function (done) {
        var filename = '/tmp/test.tmp';

        fs.writeFile(filename, "one\ntwo\nthree\n", function(err) {
            fm.countLines(filename)
                .then(function (lines) {
                    fs.unlinkSync(filename);
                    expect(lines).toBe(3);
                    done();
                });
        });
    });

    it("copies file", function (done) {
        var filename1 = __dirname + '/../config.js.dist',
            filename2 = '/tmp/test.tmp';

        fm.copyFile(filename1, filename2)
            .then(function () {
                var orig = fs.readFileSync(filename1),
                    copy = fs.readFileSync(filename2);

                fs.unlinkSync(filename2);
                expect(copy).toEqual(orig);
                done();
            });
    });
});
