/* stylesheets */

import "air-datepicker/dist/css/datepicker.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "../templates/app.css";

/* packages */

import dayjs from "dayjs";
import scrollIntoView from "scroll-into-view-if-needed";

import { Jku } from "../common/jku";
import { IApiResult, IRoomData, ITime } from "../common/types";
import { RoomSearch } from "./api";
import { ColorStatus, RoomSearchFrontend } from "./frontend";

/* globals */

// webpack will declare this global variables for us
declare let DATA_URL: string;
declare let COMMIT_HASH: string;
declare let DEBUG_MODE: boolean;

if (DEBUG_MODE) {
  console.log("debug mode enabled");
}

/* gui elements */

const datepicker = $("#datepicker");
const fromTime = $("#fromTime");
const toTime = $("#toTime");

const form = $("#form");

const results = $("#results");
const teaserText = $("#teaserText");
const teaserBlock = $("#teaserBlock");

const button = $("#button");
const spinner = $("#spinner");
const buttonText = $("#buttonText");
const versionText = $("#versionText");

const cover = $("#cover");

const anchor = $("#anchor");

/* app logic */

let api: RoomSearch | null = null;

const startTimes: ITime[] = Jku.getCourseTimes(
  Jku.FIRST_COURSE_START,
  Jku.LAST_COURSE_START
);
const endTimes: ITime[] = Jku.getCourseTimes(
  Jku.FIRST_COURSE_END,
  Jku.LAST_COURSE_END
);

const frontend = new RoomSearchFrontend(
  datepicker,
  fromTime,
  toTime,
  results,
  teaserText,
  teaserBlock,
  button,
  spinner,
  buttonText,
  versionText,
  cover
);

frontend.init(startTimes, endTimes);
frontend.render();
frontend.renderButton(false, false);

function submitHandler(event: Event) {
  frontend.renderButton(false);

  // user request
  const query = frontend.getQuery();

  if (DEBUG_MODE) {
    console.log("query", query);
  }

  if (query != null) {
    if (api != null) {
      // process user request
      const result: IApiResult | null = api.searchFreeRooms(query);

      if (DEBUG_MODE) {
        console.log("result", result);
      }

      if (result != null) {
        if (result.length > 0) {
          frontend.render(
            "😊 We found some free rooms",
            result,
            ColorStatus.Success
          );
        } else {
          frontend.render(
            "😟 Sorry, no free rooms found",
            null,
            ColorStatus.NoResult
          );
        }

        scrollIntoView(anchor[0], {
          behavior: "smooth",
          scrollMode: "if-needed",
        });
      } else {
        console.error("The search algorithm could not process the query.");
        frontend.render(
          "😟 Sorry, something broke <tt>[ERR_SEARCH_ROOMS]</tt>",
          null,
          ColorStatus.Error
        );
      }
    } else {
      console.error("Room data wasn't loaded properly.");
      frontend.render(
        "😟 Sorry, something broke <tt>[ERR_NO_DATA]</tt>",
        null,
        ColorStatus.Error
      );
    }
  } else {
    console.error(
      "The frontend input could not be parsed into a valid user query."
    );
    frontend.render(
      "😟 Sorry, something broke <tt>[ERR_PARSE_INPUT]</tt>",
      null,
      ColorStatus.Error
    );
  }

  // disable the spinner shortly
  setTimeout(() => frontend.renderButton(true), 150);
  event.preventDefault();
}

form.on("submit", submitHandler);

/* room data loading */

// cache the result by the current build id and the current day
const ajaxUrl =
  DATA_URL + "?hash=" + COMMIT_HASH + "&cache=" + dayjs().format("YYYYMMDD");

function dataLoadSuccessHandler(data: IRoomData) {
  if (DEBUG_MODE) {
    console.log("data", data);
  }

  api = new RoomSearch(data);

  frontend.renderVersion(dayjs(data.version));
  frontend.renderButton(true);
}

function dataLoadFailHandler() {
  console.error(`The XHR request 'GET ${ajaxUrl}' failed.`);
  frontend.render(
    "😟 Sorry, something broke <tt>[ERR_LOAD_DATA]</tt>",
    null,
    ColorStatus.Error
  );
}

const xhr: JQuery.jqXHR = $.getJSON(ajaxUrl);
xhr.done(dataLoadSuccessHandler);
xhr.fail(dataLoadFailHandler);

/* show page content when loading finished */
$(window).on("load", () => frontend.hideCover());
