/* stylesheets */

import "air-datepicker/dist/css/datepicker.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

/* packages */

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

/* app logic */

const startTimes: number[] = Jku.getRasterTimes("08:30", "21:30");
const endTimes: number[] = Jku.getRasterTimes("09:15", "22:15");

const frontend = new RoomSearchFrontend(datepicker, fromTime, toTime, results, teaserText, teaserBlock);

frontend.init(startTimes, endTimes);
frontend.render();

function submitHandler(event: Event) {
    const query = frontend.getQuery();
    console.log(query);

    // TODO
    frontend.render("Not implemented :(", null, ColorStatus.Info);

    event.preventDefault();
}

form.on("submit", submitHandler);
