# JKU Room Search

[![License](https://img.shields.io/badge/License-AGPL%203.0-yellow?style=flat-square)](LICENSE.txt)
[![Build Status](https://img.shields.io/travis/com/blu3r4y/jku-room-search/main.svg?style=flat-square)](https://travis-ci.com/blu3r4y/jku-room-search)
[![Website Status](https://img.shields.io/website/https/github.com/blu3r4y/jku-room-search.svg?down_color=red&down_message=down&up_color=green&up_message=online&style=flat-square)](https://blu3r4y.github.io/jku-room-search/)

Search for free rooms on the campus of the Johannes Kepler University Linz.

## Use this App

Go to [jkuroomsearch.app](https://jkuroomsearch.app)

## Build this App

Install Node.JS and simply enter

    npm install
    npm run build

During development, start a local webserver and trigger builds automatically with

    npm run serve

If you use your own local webserver, you can instead use

    npm run watch

### Create the Index

Once installed, simply enter

    npm run scrape

On success, you find a `rooms.json` file in the root directory that should go to `/data/rooms.json` on the webserver.

## Contributing

Before committing, format and lint the code with

    npm run format
    npm run lint

As a shortcut, you can run both with

    npm run fix

You can mimic the checks on the pipeline with

    npm run check
