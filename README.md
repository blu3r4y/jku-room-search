# JKU Room Search

[![License](https://img.shields.io/badge/License-AGPL%203.0-yellow?style=flat-square)](LICENSE.txt)
[![Build Status](https://img.shields.io/travis/com/blu3r4y/jku-room-search/main.svg?style=flat-square)](https://travis-ci.com/blu3r4y/jku-room-search)
[![Website Status](https://img.shields.io/website/https/github.com/blu3r4y/jku-room-search.svg?down_color=red&down_message=down&up_color=green&up_message=online&style=flat-square)](https://blu3r4y.github.io/jku-room-search/)
[![Hacktoberfest](https://img.shields.io/github/hacktoberfest/2020/blu3r4y/jku-room-search?style=flat-square)](https://github.com/blu3r4y/jku-room-search/issues)

Search for free rooms on the campus of the Johannes Kepler University Linz.

## Use this App

Go to [jkuroomsearch.app](https://jkuroomsearch.app).

## Build this App

Install Node.JS and simply enter

    npm install
    npm run build

For interactive builds, use

    npm run watch

For the local development start a webserver in watch mode by entering

    npm run serve


### Create the Index

Once installed, simply enter

    npm run scrape

On success, you find a `rooms.json` file in the root directory that should go to `/data/rooms.json` on the webserver.

## Contributing

Before committing, start the linter and let it fix errors

    npx tslint -p . -c tslint.json --fix
