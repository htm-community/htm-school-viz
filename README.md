> ## Work In Progress!
> This project is under very heavy development and will change drastically with no warning.

# HTM School Visualizations

These are supporting visualizations for the [HTM School](https://www.youtube.com/playlist?list=PL3yXMgtrZmDqhsFQzwUC9V8MeeVOQ7eZ9) educational video series.

[Here is a guide to running the complete HTM School Visualization Suite](https://discourse.numenta.org/t/how-to-run-htm-school-visualizations/2346).

## Stack

This is a web application with a Nodejs server and a JavaScript frontend.

### Server

- [node.js](http://nodejs.org/) (for serving files and HTTP Proxy to [NuPIC History Server](https://github.com/htm-community/nupic-history-server))

### Client

- Lodash
- Bootstrap
- jQuery UI
- Handlebars
- Moment

## Dependencies

-  [NuPIC History Server](https://github.com/htm-community/nupic-history-server) - install & run
- [Cell-viz](https://github.com/numenta/cell-viz/) 1.1.2 - install & generate the static content with `webpack`
#### Generate static content from cell-viz
There are 2 options:
- Permanent link: `ln -s static/js/third/dyson-bundle.js YOUR_PATH/cell-viz/out/dyson.js` This is a permanent solution, just need to update the webpack in `cell-viz` later on. 
- Generate the file: go to `cd YOUR_PATH/cell-viz/`, generate: `webpack --output-path OTHER_PATH/htm-school-viz/static/js/third --output-filename dyson-bundle.js` 


## Install

Install npm requirements:

    npm install

## Run

> **REQUIREMENT**: This server depends on the [nupic-history-server](https://github.com/htm-community/nupic-history-server) 0.0.1 running on PORT 8080. You must have that server running for any spatial pooler visualizations to work (ep. 7+). 

Now start this server on any port you like:

    npm start 8001

View on <http://localhost:8001/>.

## Episodes

Notes about the episodes. 

- Ep. 10, ep. 11: need to generate the `webpack` static content from `cell-viz`
- Ep. 10: You appear too close to the scene, press `s` to zoom-out. Currently works only in Chrome/Chromium browsers
