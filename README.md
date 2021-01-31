# JKU Room Search

[![License](https://img.shields.io/badge/License-AGPL%203.0-yellow?style=flat-square)](LICENSE.txt)
[![Build Status](https://img.shields.io/github/workflow/status/blu3r4y/jku-room-search/deploy-github-pages?style=flat-square)](https://github.com/blu3r4y/jku-room-search/actions?query=workflow%3Adeploy-github-pages)
[![Website Status](https://img.shields.io/website?style=flat-square&up_message=online&url=https%3A%2F%2Fjkuroomsearch.app)](http://jkuroomsearch.app)

Search for free rooms on the campus of the Johannes Kepler University Linz.

## Use this App

Go to [jkuroomsearch.app](https://jkuroomsearch.app)

## Build this App

Install [Node.JS](https://nodejs.org/) and [Yarn](https://classic.yarnpkg.com/) and simply enter

    yarn install
    npm run build

During development, start a local webserver and trigger development builds automatically with

    npm run serve

If you use your own local webserver, you can instead use

    npm run watch

### Create the Index

Once installed, simply enter

    npm run scrape

On success, you find a `index.json` file in the root directory that should go to `/data/index.json` on the webserver.

## Contributing

Before committing, format and lint the code with

    npm run format
    npm run lint

As a shortcut, you can run both with

    npm run fix

You can mimic the checks on the pipeline with

    npm run check
