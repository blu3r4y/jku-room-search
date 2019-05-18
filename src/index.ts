/* stylesheets */

import "air-datepicker/dist/css/datepicker.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

/* packages */

import { IResult, RoomSearch } from "./api";
import { ColorStatus, RoomSearchFrontend } from "./frontend";
import { Jku } from "./jku";

/* globals */

// webpack will declare this global hash for us
declare var __webpack_hash__: any;

declare interface IRoomSearchData {
    version: string;
    rooms: { [id: string]: "string" };
    available: { [id: string]: { [id: string]: number[][] } };
}

const ROOMS_PATH: string = "./data/rooms.json?" + __webpack_hash__;

// store with the parsed json rooms data
let ROOMS_DATA: IRoomSearchData | null = null;

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

const startTimes: number[] = Jku.getRasterTimes("08:30", "21:30");
const endTimes: number[] = Jku.getRasterTimes("09:15", "22:15");

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

    if (query) {

        if (ROOMS_DATA != null) {

            // process request
            const result: IResult = RoomSearch.searchFreeRooms(query);
            console.log("result", result);

            if (result.length > 0) {
                frontend.render("😊 We found some free rooms", result, ColorStatus.Success);
            } else {
                frontend.render("😟 Sorry, no free rooms found", null, ColorStatus.NoResult);
            }

        } else {
            console.error("Room data could not be loaded.");
            frontend.render("😟 Sorry, something broke <tt>[ERR_NO_DATA]</tt>", null, ColorStatus.Error);
        }

    } else {
        console.error("The frontend input could not be parsed into a valid query.");
        frontend.render("😟 Sorry, something broke <tt>[ERR_PARSE_INPUT]</tt>", null, ColorStatus.Error);
    }

    // disable the spinner shortly
    setTimeout(() => frontend.renderButton(true), 150);
    event.preventDefault();
}

form.on("submit", submitHandler);

/* room data loading */

function dataLoadSuccessHandler(data: IRoomSearchData) {
    console.log("data", data);
    ROOMS_DATA = data;
    frontend.renderVersion(data.version);
    frontend.renderButton(true);
}

function dataLoadFailHandler() {
    console.error(`The XHR request 'GET ${ROOMS_PATH}' failed.`);
    frontend.render("😟 Sorry, something broke <tt>[ERR_LOAD_DATA]</tt>", null, ColorStatus.Error);
}

const xhr: JQuery.jqXHR = $.getJSON(ROOMS_PATH);
xhr.done(dataLoadSuccessHandler);
xhr.fail(dataLoadFailHandler);
