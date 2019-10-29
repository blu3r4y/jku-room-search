# JKU Room Search

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg?style=popout-square)](LICENSE.txt)
[![Build Status](https://img.shields.io/travis/com/blu3r4y/jku-room-search/master.svg?style=popout-square)](https://travis-ci.com/blu3r4y/jku-room-search)
[![Website Status](https://img.shields.io/website/https/github.com/blu3r4y/jku-room-search.svg?down_color=red&down_message=down&up_color=green&up_message=online&style=popout-square)](https://blu3r4y.github.io/jku-room-search/)

Search for free rooms on the campus of the Johannes Kepler University Linz.

## Use this App

Go to [blu3r4y.github.io/jku-room-search](https://blu3r4y.github.io/jku-room-search/).

## Build this App

Install Node.JS and simply enter

    npm install
    npm run build

For interactive builds, use

    npm run watch

Before committing, start the linter and let it fix errors

    npx tslint -p . -c tslint.json --fix

### Create the Index

Simply enter

    npm run scrape

On success, you should find a `rooms.json` in the root directory.
