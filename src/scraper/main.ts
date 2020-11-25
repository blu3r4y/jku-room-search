import { writeFile } from "fs";

import { Logger } from "./log";
import { Scraper } from "./scraper";
import { IndexDto } from "../common/dto";

/** The full base URL to the kusss instance */
declare let KUSSS_URL: string;
/** The full base URL to the jku homepage */
declare let JKU_URL: string;
/** The user agent string to use in all requests */
declare let USER_AGENT: string;
/** Path to the output index.json file */
declare let OUTPUT_PATH: string;
/** How often shall individual requests be retried before raising an error */
declare let MAX_RETRIES: number;
/** How long shall be waited for a response of each request */
declare let REQUEST_TIMEOUT_MS: number;
/** How much time should we wait before retrying a request again */
declare let REQUEST_DELAY_MS: number;

Logger.info("initializing scraper", "main");

// with quick mode enabled, we will only parse some parts
const quickMode = process.argv.slice(2).includes("--quick");
if (quickMode) Logger.info("activated QUICK scraping mode");

const scraper = new Scraper(
  JKU_URL,
  KUSSS_URL,
  quickMode,
  USER_AGENT,
  REQUEST_TIMEOUT_MS,
  MAX_RETRIES,
  REQUEST_DELAY_MS
);

scraper
  .scrape()
  .then((e) => storeIndex(e, OUTPUT_PATH))
  .catch(() => process.exit(-1));

function storeIndex(index: IndexDto, path: string): void {
  writeFile(path, JSON.stringify(index), "utf-8", callback);
  function callback(error: Error | null): void {
    if (error) {
      Logger.err(`could not store result in ${path}`, "main");
      Logger.err(error);
    } else {
      Logger.info(`stored result in ${path}`, "main");
    }
  }
}
