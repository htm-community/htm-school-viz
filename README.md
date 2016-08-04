> ## Work In Progress!
> This project is under very heavy development and will change drastically with no warning.

# HTM School Visualizations

These are supporting visualizations for the [HTM School](https://www.youtube.com/playlist?list=PL3yXMgtrZmDqhsFQzwUC9V8MeeVOQ7eZ9) educational video series.

## Stack

This is a web application with a Python server and a JavaScript frontend.

### Server

- [web.py](http://webpy.org/) (for serving files and HTTP Proxy to [NuPIC History Server](https://github.com/htm-community/nupic-history-server))

### Client

- Lodash
- Bootstrap
- jQuery UI
- Handlebars
- Moment

## Install

Install web.py requirement:

    pip install -r requirements.txt

## Run

> **REQUIREMENT**: This server depends on the [nupic-history-server](https://github.com/htm-community/nupic-history-server) running on PORT 8000. You must have that server running for any spatial pooler visualizations to work.

Now start this server on any port you like:

    python server.py 8080

View on <http://localhost:8080/>.
