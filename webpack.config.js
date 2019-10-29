const path = require("path");
const webpack = require("webpack");

// extract a separate css file to avoid FOUC
const CssPlugin = require("mini-css-extract-plugin");

// help copying static assets
const CopyPlugin = require("copy-webpack-plugin");

// inject some variables into the index.html
const HtmlPlugin = require("html-webpack-plugin");

// minimizer for js
const JsMinimizerPlugin = require("terser-webpack-plugin");

// minimizer for css
const CssMinimizerPlugin = require("optimize-css-assets-webpack-plugin");

const appConfig = {
    target: "web",
    mode: "production",
    devtool: "source-map",
    entry: {
        app: "./src/app.ts",
    },
    output: {
        filename: "./js/[name].js",
        path: path.resolve(__dirname, "dist"),
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    module: {
        rules: [{
                // load css stylesheets, extract source maps and extract them separately
                test: /\.css$/,
                use: [{
                        loader: CssPlugin.loader,
                    },
                    "css-loader?sourceMap",
                ],
            },
            {
                // load and compile type script sources
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                // lint typescript files
                test: /\.ts$/,
                enforce: "pre",
                use: "tslint-loader",
            },
        ],
    },
    optimization: {
        minimizer: [
            // minimize javascript and build source map
            new JsMinimizerPlugin({
                sourceMap: true,
            }),
            // minimize css and build (and link) source map
            new CssMinimizerPlugin({
                cssProcessorOptions: {
                    map: {
                        inline: false,
                        annotation: true,
                    },
                },
            }),
        ],
    },
    plugins: [
        // add the global data url
        new webpack.DefinePlugin({
            "APP_DATA_URL": JSON.stringify("./data/rooms.json"),
        }),
        // expose the build hash as an environment variable
        new webpack.ExtendedAPIPlugin(),
        // add jquery, if we observe that its being used
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
        }),
        // extract css files to a separate file
        new CssPlugin({
            filename: "./css/[name].css",
        }),
        // copy static assets
        new CopyPlugin([{
            from: "./src/public/",
        }]),
        // inject variables into html files
        new HtmlPlugin({
            template: "./src/app.ejs",
            hash: true,
        }),
    ],
    performance: {
        // only warn if assets are larger than 1 MiB
        maxEntrypointSize: 1024000,
        maxAssetSize: 1024000,
        hints: "warning",
    },
};

const scraperConfig = {
    target: "node",
    mode: "production",
    entry: {
        scraper: "./src/scraper.ts",
    },
    output: {
        filename: "./js/[name].js",
        path: path.resolve(__dirname, "dist"),
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    module: {
        rules: [{
                // load and compile type script sources
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                // lint typescript files
                test: /\.ts$/,
                enforce: "pre",
                use: "tslint-loader",
            },
        ],
    },
    plugins: [
        // add the global scrape url and user agent
        new webpack.DefinePlugin({
            "SCRAPER_BASE_URL": JSON.stringify("https://www.kusss.jku.at"),
            "SCRAPER_USER_AGENT": JSON.stringify("jku-room-search-bot/0.1 (+https://github.com/blu3r4y/jku-room-search)"),
            "SCRAPER_DATA_PATH": JSON.stringify("rooms.json"),
            "SCRAPER_MAX_RETRIES": JSON.stringify(5),
            "SCRAPER_RETRY_DELAY": JSON.stringify(1 * 1000),  // in milliseconds
        }),
    ],
};

module.exports = [appConfig, scraperConfig];
