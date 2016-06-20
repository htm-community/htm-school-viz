#!/usr/bin/env node
var chokidar = require('chokidar');
var build = require('./build');

build();

chokidar.watch(['css', 'html', 'img', 'js', 'tmpl'], {
    ignored: /[\/\\]\./,
    ignoreInitial: true
}).on('all', function(event, path) {
    console.log('%s: %s', event, path);
    build();
});

