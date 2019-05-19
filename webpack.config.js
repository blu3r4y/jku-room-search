const path = require('path')
const webpack = require('webpack')

// extract a separate main.css file to avoid FOUC
const CssPlugin = require("mini-css-extract-plugin")

// help copying static assets
const CopyPlugin = require('copy-webpack-plugin')

// inject some variables into the index.html
const HtmlPlugin = require('html-webpack-plugin')

module.exports = {
    mode: 'production',
    devtool: 'source-map',
    entry: './src/index.ts',
    output: {
        filename: './js/[name].js',
        path: path.resolve(__dirname, 'dist')
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    module: {
        rules: [
            {
                // load css stylesheets, extract source maps and extract them separately
                test: /\.css$/,
                use: [
                    { loader: CssPlugin.loader },
                    'css-loader?sourceMap'
                ]
            },
            {
                // load and compile type script sources
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                // lint typescript files
                test: /\.ts$/,
                enforce: 'pre',
                use: 'tslint-loader',
            }
        ]
    },
    plugins: [
        // add the global data url
        new webpack.DefinePlugin(
            {
                "DATA_URL": JSON.stringify("./data/rooms.json")
            }),
        // expose the build hash as an environment variable
        new webpack.ExtendedAPIPlugin(),
        // add jquery, if we observe that its being used
        new webpack.ProvidePlugin(
            {
                $: "jquery",
                jQuery: "jquery"
            }),
        // extract css files to a separate file
        new CssPlugin(
            {
                filename: "./css/[name].css"
            }),
        // copy static assets
        new CopyPlugin([
            {
                from: './src/public/'
            }]),
        // inject variables into html files
        new HtmlPlugin(
            {
                template: './src/index.ejs',
                hash: true
            })
    ],
    performance: {
        // only warn if assets are larger than 1 MiB
        maxEntrypointSize: 1024000,
        maxAssetSize: 1024000,
        hints: 'warning'
    }
}