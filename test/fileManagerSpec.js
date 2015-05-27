'use strict';

var fs              = require('fs'),
    q               = require('q'),
    ServiceLocator  = require('../src/service-locator.js'),
    FileManager     = require('../src/file-manager.js');

describe("FileManager", function () {
    var sl, fm;

    beforeEach(function () {
        sl = new ServiceLocator();
        fm = new FileManager(sl);
    });

    it("iterates directory", function (done) {
        var base = '/tmp/eximanager-test';

        fs.mkdirSync(base);
        fs.mkdirSync(base + '/one');
        fs.writeFileSync(base + '/two', "one\ntwo\nthree\n");
        fm.iterateDir(base)
            .then(function (files) {
                fs.unlinkSync(base + '/two');
                fs.rmdirSync(base + '/one');
                fs.rmdirSync(base);
                expect(files.length).toBe(2);
                expect(files[0].name).toBe('one');
                expect(files[0].stats.isDirectory()).toBeTruthy();
                expect(files[1].name).toBe('two');
                expect(files[1].stats.isDirectory()).toBeFalsy();
                done();
            });
    });

    it("counts lines", function (done) {
        var filename = '/tmp/test.tmp';

        fs.writeFileSync(filename, "one\ntwo\nthree\n");
        fm.countLines(filename)
            .then(function (lines) {
                fs.unlinkSync(filename);
                expect(lines).toBe(3);
                done();
            });
    });

    it("looks up a key", function (done) {
        var filename = '/tmp/test.tmp';

        fs.writeFileSync(filename, "line1a: line1b\nline2a : line2b\nline3a :line3b\n");
        q.all([
            fm.lookup(filename, 'line1a'),
            fm.lookup(filename, 'line2a'),
            fm.lookup(filename, 'line3a'),
        ]).then(function (result) {
                fs.unlinkSync(filename);
                expect(result[0]).toBe('line1b');
                expect(result[1]).toBe('line2b');
                expect(result[2]).toBe('line3b');
                done();
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
