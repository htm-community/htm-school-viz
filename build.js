#!/usr/bin/env node
var fs = require('fs-extra');
var path = require('path');

var _ = require('lodash');
var Handlebars = require('handlebars');

var HTML_DIR = path.join(__dirname, 'html');

var BUILD_DIR = path.join(__dirname, 'site');
var TMPL_DIR = path.join(__dirname, 'tmpl');


function templateNameToTitle(filename) {
    var title = filename;
    var words = [title];
    if (filename == 'index') {
        return '';
    }
    if (filename.indexOf('-') > -1) {
        words = filename.split('-');
    }
    words = _.map(words, function(word) {
        return word.substr(0,1).toUpperCase() + word.substr(1);
    });
    title = 'SDR ' + words.join(' ');
    return title;
}

function prepareBuildDirectory() {
    fs.removeSync(BUILD_DIR);
    fs.mkdirSync(BUILD_DIR);
}

function executeTemplates() {
    var layoutPath = path.join(TMPL_DIR, 'layout.html');
    var layoutText = fs.readFileSync(layoutPath, 'utf8');
    var layout = Handlebars.compile(layoutText);
    _.each(fs.readdirSync(HTML_DIR), function(tmpl) {
        var name = tmpl.split('.').shift();
        var templateText = fs.readFileSync(path.join(HTML_DIR, tmpl), 'utf8');
        var hb = Handlebars.compile(templateText);
        Handlebars.registerPartial(name, hb);
        var out = layout({
            name: name,
            title: templateNameToTitle(name),
            contentTmpl: hb
        });
        var outPath = path.join(BUILD_DIR, tmpl);
        fs.writeFileSync(outPath, out);
    });
}

function copyResources() {
    _.each(['css', 'img', 'js'], function(dir) {
        var source = path.join(__dirname, dir);
        var destination = path.join(BUILD_DIR, dir);
        fs.copySync(source, destination);
    });
}

function build() {
    prepareBuildDirectory();
    executeTemplates();
    copyResources();
}

build();

module.exports = build;