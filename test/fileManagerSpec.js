'use strict';

var fs              = require('fs'),
    q               = require('q'),
    ServiceLocator  = require('../src/service-locator.js'),
    FileManager     = require('../src/file-manager.js');

describe("FileManager", function () {
    var sl, fm, config;

    beforeEach(function () {
        sl = new ServiceLocator();
        fm = new FileManager(sl);

        config = sl.get('config');
        config['file_mode'] = parseInt('0640', 8);
        config['dir_mode'] = parseInt('0750', 8);
        sl.setAllowOverride(true);
        sl.set('config', config);
    });

    it("checks directory", function (done) {
        var dir = '/tmp/eximanager-test/one/two';

        fm.checkDir(dir)
            .then(function () {
                var stat = fs.statSync(dir);

                var parts = dir.split('/');
                fs.rmdirSync(parts.join('/'));
                parts.pop();
                fs.rmdirSync(parts.join('/'));
                parts.pop();
                fs.rmdirSync(parts.join('/'));

                expect(stat.mode.toString(8)).toBe('40750');
                done();
            });
    });

    it("checks file", function (done) {
        var file = '/tmp/eximanager-test/file';

        fm.checkFile(file)
            .then(function () {
                var stat = fs.statSync(file);

                var parts = file.split('/');
                fs.unlinkSync(parts.join('/'));
                parts.pop();
                fs.rmdirSync(parts.join('/'));

                expect(stat.mode.toString(8)).toBe('100640');
                done();
            });
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
        var filename = '/tmp/eximanager-test.tmp';

        fs.writeFileSync(filename, "one\ntwo\nthree\n");
        fm.countLines(filename)
            .then(function (lines) {
                fs.unlinkSync(filename);
                expect(lines).toBe(3);
                done();
            });
    });

    it("looks up a key", function (done) {
        var filename = '/tmp/eximanager-test.tmp';

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
            filename2 = '/tmp/eximanager-test.tmp';

        fm.copyFile(filename1, filename2)
            .then(function () {
                var orig = fs.readFileSync(filename1),
                    copy = fs.readFileSync(filename2);

                fs.unlinkSync(filename2);
                expect(copy).toEqual(orig);
                done();
            });
    });

    it("reads simple file", function (done) {
        var filename = '/tmp/eximanager-test.tmp';

        fs.writeFileSync(filename, "line1a: line1b\nline2a : line2b\nline3a :line3b\n");
        fm.readSimpleFile(filename)
            .then(function (result) {
                fs.unlinkSync(filename);
                expect(result).toEqual([ ["line1a", "line1b"], ["line2a", "line2b"], ["line3a", "line3b"] ]);
                done();
            });
    });

    it("writes simple file", function (done) {
        var filename = '/tmp/eximanager-test.tmp';

        fs.writeFileSync(filename, "line1a: line1b\nline2a : line2b\nline3a :line3b\n");
        fm.writeSimpleFile(filename, 'line2a', 'foobar')
            .then(function () {
                var result = fs.readFileSync(filename, 'utf-8');
                fs.unlinkSync(filename);
                expect(result).toBe("line1a:line1b\nline2a:foobar\nline3a:line3b\n");
                done();
            });
    });

    it("reads password files", function (done) {
        var dirname = '/tmp/eximanager-test';

        fs.mkdirSync(dirname);
        fs.writeFileSync(dirname + '/master.passwd', "line1a: line1b\nline2a : line2b\nline3a :line3b\n");
        fs.writeFileSync(dirname + '/passwd', "line1a: line1b\nline2a : line2b\nline3a :line3b\n");
        fs.writeFileSync(dirname + '/quota', "line1a: quota1b\nline2a : quota2b\nline3a :quota3b\n");
        fm.readPasswordFiles(dirname)
            .then(function (result) {
                fs.unlinkSync(dirname + '/master.passwd');
                fs.unlinkSync(dirname + '/passwd');
                fs.unlinkSync(dirname + '/quota');
                fs.rmdirSync(dirname);
                expect(result).toEqual([ ["line1a", "quota1b"], ["line2a", "quota2b"], ["line3a", "quota3b"] ]);
                done();
            });
    });

    it("writes password files", function (done) {
        var dirname = '/tmp/eximanager-test';

        fs.mkdirSync(dirname);
        fs.writeFileSync(dirname + '/master.passwd', "line1a:line1b\nline2a:line2b\nline3a:line3b\n");
        fs.writeFileSync(dirname + '/passwd', "line1a:line1b\nline2a:line2b\nline3a:line3b\n");
        fm.writePasswordFiles(dirname, 'line2a', 'foobar')
            .then(function () {
                var master = fs.readFileSync(dirname + '/master.passwd', 'utf-8');
                var passwd = fs.readFileSync(dirname + '/passwd', 'utf-8');
                fs.unlinkSync(dirname + '/master.passwd');
                fs.unlinkSync(dirname + '/passwd');
                fs.rmdirSync(dirname);

                var lines = master.split("\n");
                expect(lines[0].substring(0, 13)).toBe('line1a:line1b');
                expect(lines[1].substring(0, 11)).toBe('line2a:$2a$');
                expect(lines[2].substring(0, 13)).toBe('line3a:line3b');

                var lines = passwd.split("\n");
                expect(lines[0].substring(0, 13)).toBe('line1a:line1b');
                expect(lines[1].substring(0, 8)).toBe('line2a:*');
                expect(lines[2].substring(0, 13)).toBe('line3a:line3b');
                done();
            });
    });

    it("removes directory recursively", function (done) {
        var dir = '/tmp/eximanager-test/one/two',
            file = '/tmp/eximanager-test/one/three';

        fm.checkDir(dir)
            .then(function () {
                fs.closeSync(fs.openSync(file, "w"));
                fm.rmDir('/tmp/eximanager-test')
                    .then(function () {
                        expect(fs.existsSync('/tmp/eximanager-test')).toBeFalsy();
                        done();
                    });
            });
    });

    it("removes key from file", function (done) {
        var filename = '/tmp/eximanager-test.tmp';

        fs.writeFileSync(filename, "line1a: line1b\nline2a : line2b\nline3a :line3b\n");
        fm.rmKey(filename, 'line2a')
            .then(function () {
                var result = fs.readFileSync(filename, 'utf-8');
                fs.unlinkSync(filename);
                expect(result).toBe("line1a:line1b\nline3a:line3b\n");
                done();
            });
    });
});
