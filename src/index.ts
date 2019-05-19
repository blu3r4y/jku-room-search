/* stylesheets */

import "air-datepicker/dist/css/datepicker.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

/* packages */

import { LocalDateTime, LocalTime } from "js-joda";

import { IResult, IRoomData, RoomSearch } from "./api";
import { ColorStatus, RoomSearchFrontend } from "./frontend";
import { Jku } from "./jku";
import { DateUtils } from "./utils";

/* globals */

// webpack will declare this global variables for us
declare var __webpack_hash__: string;
declare var DATA_URL: string;

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

/* app logic */

let api: RoomSearch | null = null;

const startTimes: LocalTime[] = Jku.getRasterTimes(DateUtils.fromString("08:30"), DateUtils.fromString("21:30"));
const endTimes: LocalTime[] = Jku.getRasterTimes(DateUtils.fromString("09:15"), DateUtils.fromString("22:15"));

const frontend = new RoomSearchFrontend(datepicker, fromTime, toTime,
    results, teaserText, teaserBlock,
    button, spinner, buttonText, versionText);

frontend.init(startTimes, endTimes);
frontend.render();
frontend.renderButton(false, false);

function submitHandler(event: Event) {
    frontend.renderButton(false);

    // user request
    const query = frontend.getQuery();
    console.log("query", query);

    if (query != null) {

        if (api != null) {

            // process user request
            const result: IResult | null = api.searchFreeRooms(query);
            console.log("result", result);

            if (result != null) {

                if (result.length > 0) {
                    frontend.render("😊 We found some free rooms", result, ColorStatus.Success);
                } else {
                    frontend.render("😟 Sorry, no free rooms found", null, ColorStatus.NoResult);
                }

            } else {
                console.error("The search algorithm could not process the query.");
                frontend.render("😟 Sorry, something broke <tt>[ERR_SEARCH_ROOMS]</tt>", null, ColorStatus.Error);
            }

        } else {
            console.error("Room data wasn't loaded properly.");
            frontend.render("😟 Sorry, something broke <tt>[ERR_NO_DATA]</tt>", null, ColorStatus.Error);
        }

    } else {
        console.error("The frontend input could not be parsed into a valid user query.");
        frontend.render("😟 Sorry, something broke <tt>[ERR_PARSE_INPUT]</tt>", null, ColorStatus.Error);
    }

    // disable the spinner shortly
    setTimeout(() => frontend.renderButton(true), 150);
    event.preventDefault();
}

form.on("submit", submitHandler);

/* room data loading */

function dataLoadSuccessHandler(data: IRoomData) {
    console.log("data", data);
    api = new RoomSearch(data);

    frontend.renderVersion(LocalDateTime.parse(data.version));
    frontend.renderButton(true);
}

function dataLoadFailHandler() {
    console.error(`The XHR request 'GET ${DATA_URL}' failed.`);
    frontend.render("😟 Sorry, something broke <tt>[ERR_LOAD_DATA]</tt>", null, ColorStatus.Error);
}

const xhr: JQuery.jqXHR = $.getJSON(DATA_URL);
xhr.done(dataLoadSuccessHandler);
xhr.fail(dataLoadFailHandler);
