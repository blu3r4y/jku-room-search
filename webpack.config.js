const fs = require("fs");
const path = require("path");
const { globSync } = require("glob");
const fetch = require("node-fetch");
const webpack = require("webpack");

// extract css file to avoid FOUC
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

// purge unused css
const { PurgeCSSPlugin } = require("purgecss-webpack-plugin");

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
  // fetch current git commit hash
  return ChildProcess.execSync(`git ${command}`, { encoding: "utf8" }).trim();
}

async function fetchMonitoringCode() {
  // inline deferred monitoring code snippet
  if (process.env.DYNATRACE_API_TOKEN) {
    const url = `https://bjd63129.dev.dynatracelabs.com/api/v1/rum/jsInlineScript/APPLICATION-54BCAC95EB286EE9?Api-Token=${process.env.DYNATRACE_API_TOKEN}`;
    const respose = await fetch(url);
    return respose.text();
  } else {
    return "<!-- could not fetch monitoring code -->";
  }
}

const appConfig = async (env, options) => {
  return {
    target: ["web", "es6"],
    entry: {
      app: "./src/app/main.ts",
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
          use: [MiniCssExtractPlugin.loader, "css-loader", "source-map-loader"],
        },
      ],
    },
    optimization: {
      minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
    },
    devtool: "source-map",
    devServer: {
      static: "./dist",
    },
    plugins: [
      new webpack.DefinePlugin({
        INDEX_URL: JSON.stringify("./data/index.json"),
        COMMIT_HASH: JSON.stringify(git("rev-parse HEAD")),
        DEBUG_MODE: JSON.stringify(options.mode !== "production"),
      }),
      new MiniCssExtractPlugin({
        filename: "./css/[name].[contenthash].css",
      }),
      new PurgeCSSPlugin({
        paths: globSync(
          `${path.join(__dirname, "src").replace(/\\/g, "/")}/**/*`,
          { nodir: true },
        ),
        safelist: {
          greedy: [/^air-datepicker/],
        },
      }),
      new HtmlPlugin({
        template: "./src/templates/app.ejs",
        monitoringCode:
          options.mode === "production"
            ? await fetchMonitoringCode()
            : "<!-- no monitoring code in development mode -->",
      }),
      new CopyPlugin({
        patterns: [{ from: "./src/public/" }],
      }),
    ],
    performance: {
      maxEntrypointSize: 1024000,
      maxAssetSize: 1024000,
      hints: "warning",
    },
  };
};

// a file with some hand-coded extra resources necessary for scraping
const extraResources = JSON.parse(
  fs.readFileSync("./src/scraper/resources/extra.json"),
);

const scraperConfig = async (env, options) => {
  return {
    target: "node",
    entry: {
      scraper: "./src/scraper/main.ts",
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
        KUSSS_URL: JSON.stringify("https://www.kusss.jku.at"),
        JKU_URL: JSON.stringify("https://www.jku.at"),
        USER_AGENT: JSON.stringify(
          "jku-room-search-bot/0.1 (+https://github.com/blu3r4y/jku-room-search)",
        ),
        OUTPUT_PATH: JSON.stringify("index.json"),
        MAX_RETRIES: JSON.stringify(5),
        MAX_ERRORS: JSON.stringify(3),
        REQUEST_TIMEOUT_MS: JSON.stringify(5 * 1000),
        REQUEST_DELAY_MS:
          options.mode !== "production"
            ? JSON.stringify(500)
            : JSON.stringify(1),
        IGNORE_ROOMS: JSON.stringify(extraResources["ignore"]),
        EXTRA_BUILDING_METADATA: JSON.stringify(extraResources["buildings"]),
        EXTRA_CAPACITY_METADATA: JSON.stringify(extraResources["capacities"]),
      }),
      new webpack.ContextReplacementPlugin(/keyv/),
    ],
  };
};

module.exports = async (env, options) => [
  await appConfig(env, options),
  await scraperConfig(env, options),
];
