var proxy = require('express-http-proxy');
var express = require('express');
var exphbs = require('express-handlebars');
var serveStatic = require('serve-static');
var glob = require('glob');
var path = require('path');

//get port from command line arguments
var port = process.argv[2] || 8001;

var app = express();

var NUPIC_SERVER = "http://localhost:8080";
var GIF_PATH = "static/data/gifData/";

//use handlebars render engine using the existing locations
app.engine('.html', exphbs({
    extname: '.html',
    defaultLayout: 'layout',
    layoutsDir: "tmpl/"
}));
app.set('view engine', '.html');
app.set('views', 'html/');

//paths
app.use('/static', serveStatic(__dirname + '/static'));
app.use('/client/ep11/audio/casio', serveStatic(__dirname + '/static/js/ep11/audio/casio'));
app.get('/', index);
app.get('/client/:ep/:file', client);
app.use('/_proxy', proxy(NUPIC_SERVER));
app.get('/_giflist', gifList);

//serve
app.listen(port);
console.log('htm-school-viz running on http://localhost:' + port);

//handlers
function index(req, res) {
    res.render('index', {
        name: 'index',
        title: 'HTM School Visualizations'
    });
}

function client(req, res) {
    var name = (req.params.ep + '/' + req.params.file).split('.')[0];
    res.render(name, {
        name: name,
        title: title(name)
    });
}

function gifList(req, res) {
    glob(path.resolve(__dirname, GIF_PATH, '*.json'), function(err, list) {
        res.json({
            gifs: list.map(function(abspath) {
                return {
                    path: '/' + path.relative(__dirname, abspath),
                    dimensions: require(abspath).dimensions
                };
            })
        });
    });
}

//helpers
//Replaces dashes by space and capitalizes every word
function title(str) {
    return str.replace(/-/g, ' ').replace(/\w+/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}
