import dayjs from "dayjs";
import { App } from "./app";

// bundle stylesheets with webpack
import "bootstrap/dist/css/bootstrap.min.css";
import "air-datepicker/dist/css/datepicker.min.css";

// our style overrides must come last!
import "../templates/app.css";

/** The full url to the index.json (injected by webpack) */
declare let INDEX_URL: string;
/** The commit hash of this build (injected by webpack) */
declare let COMMIT_HASH: string;
/** True if this is a development build (injected by webpack) */
declare let DEBUG_MODE: boolean;

// prepare the cache-busting index url
const today = dayjs().format("YYYYMMDD");
const indexUrl = INDEX_URL + `?v=${COMMIT_HASH}-${today}`;

const app = new App(indexUrl, DEBUG_MODE);
app.init();
