const webpack = require("webpack");

// extract css file to avoid FOUC
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

// minimizer for css
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

// minimizer for js
const TerserPlugin = require("terser-webpack-plugin");

// inject variables into the index.html
const HtmlPlugin = require("html-webpack-plugin");

// copy statis assets
const CopyPlugin = require("copy-webpack-plugin");

// query git metadata
const ChildProcess = require("child_process");
function git(command) {
  return ChildProcess.execSync(`git ${command}`, { encoding: "utf8" }).trim();
}

const appConfig = {
  target: ["web", "es5"],
  entry: {
    app: "./src/app.ts",
  },
  output: {
    filename: "./js/[name].[contenthash].js",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  optimization: {
    minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
  },
  devtool: "source-map",
  devServer: {
    contentBase: "./dist",
  },
  plugins: [
    new webpack.DefinePlugin({
      DATA_URL: JSON.stringify("./data/rooms.json"),
      COMMIT_HASH: JSON.stringify(git("rev-parse HEAD")),
    }),
    new MiniCssExtractPlugin({
      filename: "./css/[name].[contenthash].css",
    }),
    new HtmlPlugin({
      template: "./src/app.ejs",
    }),
    new CopyPlugin({
      patterns: [{ from: "./src/public/" }],
    }),
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
    }),
  ],
  performance: {
    maxEntrypointSize: 1024000,
    maxAssetSize: 1024000,
    hints: "warning",
  },
};

const scraperConfig = {
  target: "node",
  entry: {
    scraper: "./src/scraper.ts",
  },
  output: {
    filename: "./js/[name].js",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      BASE_URL_KUSSS: JSON.stringify("https://www.kusss.jku.at"),
      BASE_URL_JKU: JSON.stringify("https://www.jku.at"),
      USER_AGENT: JSON.stringify(
        "jku-room-search-bot/0.1 (+https://github.com/blu3r4y/jku-room-search)"
      ),
      DATA_PATH: JSON.stringify("rooms.json"),
      MAX_RETRIES: JSON.stringify(5),
      REQUEST_TIMEOUT_MS: JSON.stringify(5 * 1000),
      REQUEST_DELAY_MS: JSON.stringify(500),
    }),
  ],
};

module.exports = [appConfig, scraperConfig];
