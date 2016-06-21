# HTM School Visualizations

These are supporting visualizations for the [HTM School](https://www.youtube.com/playlist?list=PL3yXMgtrZmDqhsFQzwUC9V8MeeVOQ7eZ9) educational video series.

## Stack

This is a web application with a Python server (so we can run [NuPIC](https://github.com/numenta/nupic) and a JavaScript frontend.

### Server

- [web.py]()
- NuPIC (for episodes 7+)

### Client

- Lodash
- Bootstrap
- jQuery UI
- Handlebars
- Moment

## Install

It's up to you to get [NuPIC](https://github.com/numenta/nupic) installed properly. It is not defined in `requirements.txt` because it doesn't install properly via pip on Linux.

    pip install -r requirements.txt

## Run

    python server.py

View on <http://localhost:8080/>.
