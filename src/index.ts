/* stylesheets */

import "air-datepicker/dist/css/datepicker.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

/* packages */

import { IResult, RoomSearch } from "./api";
import { ColorStatus, RoomSearchFrontend } from "./frontend";
import { Jku } from "./jku";

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

/* app logic */

const startTimes: number[] = Jku.getRasterTimes("08:30", "21:30");
const endTimes: number[] = Jku.getRasterTimes("09:15", "22:15");

const frontend = new RoomSearchFrontend(datepicker, fromTime, toTime,
    results, teaserText, teaserBlock,
    button, spinner, buttonText);

frontend.init(startTimes, endTimes);
frontend.render();

function submitHandler(event: Event) {
    frontend.renderSpinner(true);

    // user request
    const query = frontend.getQuery();
    console.log(query);

    if (query) {

        // process request
        const result: IResult = RoomSearch.searchFreeRooms(query);
        console.log(result);

        if (result.length > 0) {
            frontend.render("😊 We found some free rooms", result, ColorStatus.Success);
        } else {
            frontend.render("😟 Sorry, no free rooms found", null, ColorStatus.NoResult);
        }

    } else {
        // something broke
        frontend.render("😟 Sorry, something broke", null, ColorStatus.Error);
    }

    // disable the spinner shortly
    setTimeout(() => frontend.renderSpinner(false), 250);
    event.preventDefault();
}

form.on("submit", submitHandler);
